import { NextResponse } from "next/server";
import { createFlutterwavePayment } from "@/lib/payments";
import { getReport, markReportPaymentStarted } from "@/lib/report-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.reportId || !body?.email) {
    return NextResponse.json({ error: "Report ID and email are required." }, { status: 400 });
  }

  const report = await getReport(String(body.reportId));
  if (!report) {
    return NextResponse.json({ error: "This report has expired. Please analyze the CV again." }, { status: 404 });
  }

  const payment = await createFlutterwavePayment({
    reportId: String(body.reportId),
    email: String(body.email),
    name: body.name ? String(body.name) : undefined
  });
  await markReportPaymentStarted(
    String(body.reportId),
    payment.reference,
    String(body.email),
    body.name ? String(body.name) : undefined
  );

  return NextResponse.json(payment);
}
