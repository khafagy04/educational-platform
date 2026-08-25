import type { Request, Response } from 'express';
import { UnauthorizedError, ValidationError } from '../../errors/application-error.js';
import type { FawaterkWebhook } from '../../integrations/fawaterk/fawaterk.provider.js';
import type { PaymentsService } from './payments.service.js';
import type {
  CreateOrderInput,
  PayOrderInput,
  TopupInput,
  TransactionListInput,
} from './payments.validators.js';

export class PaymentsController {
  public constructor(private readonly service: PaymentsService) {}

  public wallet = async (request: Request, response: Response): Promise<void> => {
    response.json({ data: { wallet: await this.service.getWallet(this.userId(request)) } });
  };

  public transactions = async (request: Request, response: Response): Promise<void> => {
    response.json({
      data: await this.service.listTransactions(
        this.userId(request),
        request.validated.query as TransactionListInput,
      ),
    });
  };

  public topup = async (request: Request, response: Response): Promise<void> => {
    const result = await this.service.topup(
      this.userId(request),
      request.validated.body as TopupInput,
      this.idempotencyKey(request),
    );
    response.status(201).json({ data: result });
  };

  public createOrder = async (request: Request, response: Response): Promise<void> => {
    const order = await this.service.createOrder(
      this.userId(request),
      request.validated.body as CreateOrderInput,
      this.idempotencyKey(request),
    );
    response.status(201).json({ data: { order } });
  };

  public payOrder = async (request: Request, response: Response): Promise<void> => {
    const result = await this.service.payOrder(
      this.userId(request),
      this.orderId(request),
      request.validated.body as PayOrderInput,
    );
    response.json({ data: result });
  };

  public webhook = async (request: Request, response: Response): Promise<void> => {
    const result = await this.service.processWebhook(request.validated.body as FawaterkWebhook);
    response.json({ data: { accepted: true, ...result } });
  };

  private userId(request: Request): string {
    if (!request.user) throw new UnauthorizedError();
    return request.user.id;
  }

  private orderId(request: Request): string {
    return (request.validated.params as { id: string }).id;
  }

  private idempotencyKey(request: Request): string {
    const value = request.header('idempotency-key')?.trim();
    if (!value || !/^[a-zA-Z0-9:_-]{8,255}$/.test(value)) {
      throw new ValidationError('يلزم إرسال مفتاح Idempotency-Key صالح');
    }
    return value;
  }
}
