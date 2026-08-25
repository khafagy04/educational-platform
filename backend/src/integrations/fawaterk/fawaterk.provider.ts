import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { UnauthorizedError, ServiceUnavailableError } from '../../errors/application-error.js';

export type PaymentCustomer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

export type InitiatePaymentInput = {
  amount: string;
  currency: string;
  itemName: string;
  customer: PaymentCustomer;
  reference: string;
};

export type PaymentSession = {
  checkoutUrl: string;
  invoiceId: string;
  invoiceKey: string;
};

export type FawaterkWebhook = {
  hashKey: string;
  invoice_key: string;
  invoice_id: string | number;
  payment_method: string;
  invoice_status: string;
  pay_load?: unknown;
  referenceNumber?: string;
};

export type VerifiedPaymentEvent = {
  eventId: string;
  invoiceId: string;
  invoiceKey: string;
  status: 'paid';
  payload: FawaterkWebhook;
};

export type FawaterkProvider = {
  initiatePayment(input: InitiatePaymentInput): Promise<PaymentSession>;
  verifyWebhook(payload: FawaterkWebhook): VerifiedPaymentEvent;
};

const signatureInput = (payload: FawaterkWebhook): string =>
  `InvoiceId=${String(payload.invoice_id)}&InvoiceKey=${payload.invoice_key}&PaymentMethod=${payload.payment_method}`;

export const signFawaterkWebhook = (
  payload: Omit<FawaterkWebhook, 'hashKey'>,
  vendorKey: string,
): string =>
  createHmac('sha256', vendorKey)
    .update(signatureInput({ ...payload, hashKey: '' }))
    .digest('hex');

abstract class VerifiedFawaterkProvider implements FawaterkProvider {
  protected constructor(protected readonly vendorKey: string) {}

  public abstract initiatePayment(input: InitiatePaymentInput): Promise<PaymentSession>;

  public verifyWebhook(payload: FawaterkWebhook): VerifiedPaymentEvent {
    const expected = signFawaterkWebhook(payload, this.vendorKey);
    const supplied = payload.hashKey.toLowerCase();
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    ) {
      throw new UnauthorizedError('توقيع إشعار الدفع غير صالح');
    }
    if (payload.invoice_status.toLowerCase() !== 'paid') {
      throw new UnauthorizedError('حالة إشعار الدفع غير مدعومة');
    }
    return {
      eventId: `${String(payload.invoice_id)}:paid`,
      invoiceId: String(payload.invoice_id),
      invoiceKey: payload.invoice_key,
      status: 'paid',
      payload,
    };
  }
}

export class LocalFawaterkProvider extends VerifiedFawaterkProvider {
  public constructor(vendorKey = env.FAWATERK_VENDOR_KEY) {
    super(vendorKey);
  }

  public async initiatePayment(_input: InitiatePaymentInput): Promise<PaymentSession> {
    void _input;
    const invoiceKey = randomBytes(16).toString('hex');
    await Promise.resolve();
    return {
      checkoutUrl: `http://localhost:3000/payments/local/${invoiceKey}`,
      invoiceId: randomBytes(8).toString('hex'),
      invoiceKey,
    };
  }
}

type InvoiceResponse = {
  status: string;
  data?: { url?: string; invoiceKey?: string; invoiceId?: string | number };
};

export class FawaterkApiProvider extends VerifiedFawaterkProvider {
  public constructor(
    vendorKey: string,
    private readonly apiToken: string,
    private readonly baseUrl: string,
  ) {
    super(vendorKey);
  }

  public async initiatePayment(input: InitiatePaymentInput): Promise<PaymentSession> {
    const [firstName, ...remainingName] = input.customer.name.trim().split(/\s+/);
    try {
      const response = await fetch(`${this.baseUrl}/createInvoiceLink`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          cartTotal: input.amount,
          currency: input.currency,
          customer: {
            first_name: firstName ?? 'Student',
            last_name: remainingName.join(' ') || 'Student',
            email: input.customer.email,
            ...(input.customer.phone ? { phone: input.customer.phone } : {}),
            customer_unique_id: input.customer.id,
          },
          redirectionUrls: {
            successUrl: `${env.APP_URL}/payments/success`,
            failUrl: `${env.APP_URL}/payments/failed`,
            pendingUrl: `${env.APP_URL}/payments/pending`,
            webhookUrl: `${env.API_PUBLIC_URL}/api/v1/webhooks/fawaterk_json`,
          },
          cartItems: [{ name: input.itemName, price: input.amount, quantity: 1 }],
          payLoad: { reference: input.reference },
          sendEmail: false,
          sendSMS: false,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json()) as InvoiceResponse;
      if (
        !response.ok ||
        body.status !== 'success' ||
        !body.data?.url ||
        !body.data.invoiceKey ||
        body.data.invoiceId === undefined
      ) {
        throw new Error('Provider error');
      }
      return {
        checkoutUrl: body.data.url,
        invoiceId: String(body.data.invoiceId),
        invoiceKey: body.data.invoiceKey,
      };
    } catch {
      throw new ServiceUnavailableError('بوابة الدفع غير متاحة مؤقتاً');
    }
  }
}

export const createFawaterkProvider = (): FawaterkProvider => {
  if (env.PAYMENT_PROVIDER === 'local') return new LocalFawaterkProvider();
  if (!env.FAWATERK_API_TOKEN) throw new Error('Fawaterk API token is required.');
  return new FawaterkApiProvider(
    env.FAWATERK_VENDOR_KEY,
    env.FAWATERK_API_TOKEN,
    env.FAWATERK_BASE_URL,
  );
};
