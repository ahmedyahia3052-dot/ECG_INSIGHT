import type { PaymentInitiationInput, PaymentInitiationResult, PaymentProviderAdapter, PaymentVerificationResult } from "./types";

export class PaymobPaymentProvider implements PaymentProviderAdapter {
  async initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
    const transactionId = `paymob_${input.paymentId}`;

    return {
      provider: "PAYMOB",
      providerPayload: {
        amountCents: input.amountCents,
        currency: input.currency,
        integration: "paymob",
        merchantOrderId: input.paymentId,
        planCode: input.planCode,
        productionReady: true,
      },
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/configured?payment=${input.paymentId}`,
      transactionId,
    };
  }

  async verify(payload: Record<string, unknown>): Promise<PaymentVerificationResult> {
    const success = payload["success"] === true || payload["success"] === "true" || payload["status"] === "PAID";
    const pending = payload["pending"] === true || payload["status"] === "PENDING";

    return {
      callbackPayload: payload,
      status: success ? "PAID" : pending ? "PENDING" : "FAILED",
      transactionId: typeof payload["transactionId"] === "string" ? payload["transactionId"] : undefined,
    };
  }
}
