import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import React from "react";
import { CvReportDocument } from "@/lib/report-pdf";
import { getReport } from "@/lib/report-store";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const report = await getReport(reportId);

  if (!report) {
    return NextResponse.json({ error: "This report has expired. Please analyze the CV again." }, { status: 404 });
  }

  if (!report.paid && process.env.ALLOW_FREE_REPORTS !== "true") {
    return NextResponse.json({ error: "Payment is required before downloading this report." }, { status: 402 });
  }

  const document = React.createElement(CvReportDocument, { result: report.result }) as React.ReactElement;
  const buffer = await renderToBuffer(document as Parameters<typeof renderToBuffer>[0]);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cv-rank-report-${reportId}.pdf"`
    }
  });
}
