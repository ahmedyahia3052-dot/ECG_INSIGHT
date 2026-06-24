import type { PaymentProvider } from "@prisma/client";

export interface PaymentInitiationInput {
  amountCents: number;
  currency: string;
  paymentId: string;
  planCode: string;
  userEmail: string;
  userId: string;
}

export interface PaymentInitiationResult {
  provider: PaymentProvider;
  providerPayload: Record<string, unknown>;
  redirectUrl?: string;
  transactionId?: string;
}

export interface PaymentVerificationResult {
  callbackPayload: Record<string, unknown>;
  status: "APPROVED" | "FAILED" | "PAID" | "PENDING";
  transactionId?: string;
}

export interface PaymentProviderAdapter {
  initiate(input: PaymentInitiationInput): Promise<PaymentInitiationResult>;
  verify(payload: Record<string, unknown>): Promise<PaymentVerificationResult>;
}
