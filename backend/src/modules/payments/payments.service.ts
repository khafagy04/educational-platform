import { Service } from '../../core/service.js';
import { NotFoundError } from '../../errors/application-error.js';
import type {
  FawaterkProvider,
  FawaterkWebhook,
} from '../../integrations/fawaterk/fawaterk.provider.js';
import type { PaymentsRepositoryPort } from './payments.repository.js';
import type {
  CreateOrderInput,
  PayOrderInput,
  TopupInput,
  TransactionListInput,
} from './payments.validators.js';

export class PaymentsService extends Service<PaymentsRepositoryPort> {
  public constructor(
    repository: PaymentsRepositoryPort,
    private readonly provider: FawaterkProvider,
  ) {
    super(repository);
  }

  public getWallet(userId: string): Promise<unknown> {
    return this.repository.getWallet(userId);
  }

  public listTransactions(userId: string, input: TransactionListInput): Promise<unknown> {
    return this.repository.listTransactions(userId, input.page, input.pageSize);
  }

  public async topup(userId: string, input: TopupInput, idempotencyKey: string): Promise<unknown> {
    const customer = await this.customer(userId);
    const amount = input.amount.toFixed(2);
    const transaction = await this.repository.createTopup(userId, amount, idempotencyKey);
    try {
      const session = await this.provider.initiatePayment({
        amount,
        currency: 'EGP',
        itemName: 'شحن محفظة منصة التعلّم',
        customer,
        reference: transaction.id,
      });
      await this.repository.attachTopupSession(transaction.id, session.invoiceKey);
      return {
        transaction: { id: transaction.id, status: 'PENDING' },
        checkout: { url: session.checkoutUrl },
      };
    } catch (error) {
      await this.repository.failTopup(transaction.id);
      throw error;
    }
  }

  public createOrder(
    userId: string,
    input: CreateOrderInput,
    idempotencyKey: string,
  ): Promise<unknown> {
    return this.repository.createOrder(userId, input.courseId, idempotencyKey);
  }

  public async payOrder(userId: string, orderId: string, input: PayOrderInput): Promise<unknown> {
    if (input.method === 'WALLET') return this.repository.payWithWallet(userId, orderId);
    const customer = await this.customer(userId);
    const payment = await this.repository.createPendingProviderPayment(userId, orderId);
    try {
      const session = await this.provider.initiatePayment({
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
        itemName: payment.courseTitle,
        customer,
        reference: payment.id,
      });
      await this.repository.attachPaymentSession(payment.id, session.invoiceId, session.invoiceKey);
      return {
        payment: { id: payment.id, status: 'PENDING' },
        checkout: { url: session.checkoutUrl },
      };
    } catch (error) {
      await this.repository.failPayment(payment.id);
      throw error;
    }
  }

  public processWebhook(input: FawaterkWebhook): Promise<{ replayed: boolean; kind?: string }> {
    return this.repository.processWebhook(this.provider.verifyWebhook(input));
  }

  private async customer(userId: string) {
    const customer = await this.repository.findCustomer(userId);
    if (!customer) throw new NotFoundError('المستخدم غير موجود');
    return customer;
  }
}
