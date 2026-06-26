import type { PaymentProvider } from "@prisma/client";
import type { PaymentInitiationInput, PaymentInitiationResult, PaymentProviderAdapter, PaymentVerificationResult } from "./types";

export class ManualPaymentProvider implements PaymentProviderAdapter {
  constructor(private readonly provider: Extract<PaymentProvider, "BANK_TRANSFER" | "CARD" | "INSTAPAY" | "STRIPE" | "WALLET">) {}

  async initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult> {
    const transactionId = `${this.provider.toLowerCase()}_${input.paymentId}`;

    return {
      provider: this.provider,
      providerPayload: {
        amountCents: input.amountCents,
        currency: input.currency,
        instructions:
          this.provider === "BANK_TRANSFER"
            ? "Transfer to the configured ECG Insight bank account and upload proof for finance approval."
            : this.provider === "INSTAPAY" || this.provider === "WALLET"
            ? "Upload a payment receipt for Owner review."
            : "Provider checkout is prepared for future activation.",
        planCode: input.planCode,
      },
      transactionId,
    };
  }

  async verify(payload: Record<string, unknown>): Promise<PaymentVerificationResult> {
    return {
      callbackPayload: payload,
      status: payload["approved"] === true ? "APPROVED" : "PENDING",
      transactionId: typeof payload["transactionId"] === "string" ? payload["transactionId"] : undefined,
    };
  }
}
