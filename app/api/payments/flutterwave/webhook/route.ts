import { NextResponse } from "next/server";
import { sendReportReadyEmail } from "@/lib/email";
import { getReportPrice, verifyFlutterwavePayment } from "@/lib/payments";
import { markReportPaid } from "@/lib/report-store";

export const runtime = "nodejs";

type FlutterwaveWebhookPayload = {
  event?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    status?: string;
  };
};

export async function POST(request: Request) {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  const signature = request.headers.get("verif-hash");

  if (secretHash && signature !== secretHash) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as FlutterwaveWebhookPayload | null;
  const txRef = payload?.data?.tx_ref;
  const transactionId = payload?.data?.id ? String(payload.data.id) : undefined;
  const reportId = txRef?.match(/^cvrank-(.+)-\d+$/)?.[1];

  if (!txRef || !transactionId || !reportId || payload?.data?.status !== "successful") {
    return NextResponse.json({ received: true });
  }

  const verified = await verifyFlutterwavePayment(transactionId, txRef, getReportPrice());
  if (!verified) {
    return NextResponse.json({ error: "Transaction could not be verified." }, { status: 400 });
  }

  const report = await markReportPaid(reportId, txRef, transactionId);
  if (report) {
    await sendReportReadyEmail({
      to: report.payerEmail,
      name: report.payerName,
      reportId,
      result: report.result
    });
  }

  return NextResponse.json({ received: true });
}
