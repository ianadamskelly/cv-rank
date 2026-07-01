import { getAppUrl } from "@/lib/url";

export type PaymentInitRequest = {
  email: string;
  name?: string;
  reportId: string;
};

export type PaymentInitResponse = {
  reference: string;
  amount: number;
  currency: "KES";
  paymentLink?: string;
};

type FlutterwavePaymentResponse = {
  status: string;
  message: string;
  data?: {
    link?: string;
  };
};

type FlutterwaveVerifyResponse = {
  status: string;
  data?: {
    id?: number;
    tx_ref?: string;
    status?: string;
    currency?: string;
    amount?: number;
  };
};

export function getReportPrice() {
  const configured = Number(process.env.REPORT_PRICE_KES ?? "99");
  return Number.isFinite(configured) && configured > 0 ? configured : 99;
}

export function makePaymentReference(reportId: string) {
  return `cvrank-${reportId}-${Date.now()}`;
}

export function getFlutterwavePublicKey() {
  return process.env.FLUTTERWAVE_PUBLIC_KEY;
}

export function getFlutterwaveSecretKey() {
  return process.env.FLUTTERWAVE_SECRET_KEY;
}

export async function createFlutterwavePayment(input: PaymentInitRequest): Promise<PaymentInitResponse> {
  const secretKey = getFlutterwaveSecretKey();
  const amount = getReportPrice();
  const reference = makePaymentReference(input.reportId);
  const appUrl = getAppUrl();

  if (!secretKey) {
    return {
      reference,
      amount,
      currency: "KES",
      paymentLink: `/payment/complete?status=successful&tx_ref=${reference}&report_id=${input.reportId}&demo=true`
    };
  }

  const flutterwaveBaseUrl = process.env.FLUTTERWAVE_BASE_URL ?? "https://api.flutterwave.com/v3";
  const response = await fetch(`${flutterwaveBaseUrl}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency: "KES",
      redirect_url: `${appUrl}/payment/complete?report_id=${input.reportId}`,
      customer: {
        email: input.email,
        name: input.name || input.email
      },
      customizations: {
        title: "CV Rank Full Report",
        description: "Download the full CV readiness report",
        logo: `${appUrl}/kuza-logo.png`
      },
      meta: {
        report_id: input.reportId
      }
    })
  });

  const payload = (await response.json()) as FlutterwavePaymentResponse;
  if (!response.ok || payload.status !== "success" || !payload.data?.link) {
    throw new Error(payload.message || "Could not start Flutterwave payment.");
  }

  return {
    reference,
    amount,
    currency: "KES",
    paymentLink: payload.data.link
  };
}

export async function verifyFlutterwavePayment(transactionId: string, expectedTxRef: string, expectedAmount: number) {
  const secretKey = getFlutterwaveSecretKey();
  if (!secretKey) return false;

  const flutterwaveBaseUrl = process.env.FLUTTERWAVE_BASE_URL ?? "https://api.flutterwave.com/v3";
  const response = await fetch(`${flutterwaveBaseUrl}/transactions/${transactionId}/verify`, {
    headers: {
      Authorization: `Bearer ${secretKey}`
    }
  });
  const payload = (await response.json()) as FlutterwaveVerifyResponse;
  const data = payload.data;

  return Boolean(
    response.ok &&
      payload.status === "success" &&
      data?.status === "successful" &&
      data.tx_ref === expectedTxRef &&
      data.currency === "KES" &&
      Number(data.amount) >= expectedAmount
  );
}
