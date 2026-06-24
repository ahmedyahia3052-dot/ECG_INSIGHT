import type { PaymentProvider } from "@prisma/client";
import { ManualPaymentProvider } from "./manual";
import { PaymobPaymentProvider } from "./paymob";
import type { PaymentProviderAdapter } from "./types";

export function paymentProvider(provider: PaymentProvider): PaymentProviderAdapter {
  if (provider === "PAYMOB") return new PaymobPaymentProvider();
  return new ManualPaymentProvider(provider);
}

export type { PaymentInitiationInput, PaymentInitiationResult, PaymentVerificationResult } from "./types";
