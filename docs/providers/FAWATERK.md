# Fawaterk adapter

The production adapter creates hosted invoice links with `createInvoiceLink`, sends a server-owned reference in `payLoad`, and directs paid callbacks to `/api/v1/webhooks/fawaterk_json`. Browser redirects are display-only. Paid state is accepted only after verifying the provider's HMAC-SHA256 `hashKey` over:

`InvoiceId=<invoice_id>&InvoiceKey=<invoice_key>&PaymentMethod=<payment_method>`

The webhook inbox uses the normalized event key `<invoice_id>:paid` to make credit and enrollment effects idempotent.

## Environment

- `PAYMENT_PROVIDER=fawaterk`
- `FAWATERK_BASE_URL=https://staging.fawaterk.com/api/v2` for sandbox
- `FAWATERK_API_TOKEN`
- `FAWATERK_VENDOR_KEY`
- `API_PUBLIC_URL` with a publicly reachable HTTPS API origin
- `APP_URL` with the frontend payment-result pages

Local development uses `PAYMENT_PROVIDER=local`; it provisions deterministic-style local checkout sessions but does not count as Fawaterk acceptance.

## Real-provider smoke checklist

1. Configure a dedicated sandbox webhook ending in `_json` and verify HTTPS delivery.
2. Initiate a wallet top-up and confirm no balance change on redirect alone.
3. Complete the sandbox payment and confirm one webhook credits the wallet once.
4. Redeliver the exact callback and confirm no second credit.
5. Initiate direct course checkout and confirm enrollment is absent until the paid webhook.
6. Confirm the paid webhook activates an enrollment with the course access duration.
7. Submit invalid and modified signatures and confirm 401 with no durable effects.
8. Review logs for API token, vendor key, checkout details, and webhook payload leakage.
9. Reconcile provider invoice IDs/amounts with Payment and WalletTransaction records.

Implementation references: [hosted invoice link](https://fawaterak-api.readme.io/reference/sendpayment) and [paid webhook signature](https://fawaterak-api.readme.io/reference/web-hook).
