import Link from "next/link";
import Image from "next/image";
import { sendReportReadyEmail } from "@/lib/email";
import { getReport, markReportPaid } from "@/lib/report-store";
import { getReportPrice, getFlutterwaveSecretKey, verifyFlutterwavePayment } from "@/lib/payments";

export default async function PaymentComplete({
  searchParams
}: {
  searchParams: Promise<{
    report_id?: string;
    status?: string;
    tx_ref?: string;
    transaction_id?: string;
    demo?: string;
  }>;
}) {
  const params = await searchParams;
  const reportId = params.report_id;
  const txRef = params.tx_ref;
  const transactionId = params.transaction_id;
  const report = reportId ? await getReport(reportId) : null;
  let state: "missing" | "failed" | "verified" | "pending" = "pending";
  let emailSent = false;

  if (!reportId || !report) {
    state = "missing";
  } else if (report.paid) {
    state = "verified";
  } else if (params.demo === "true" && !getFlutterwaveSecretKey() && txRef) {
    const paidReport = await markReportPaid(reportId, txRef, "demo");
    if (paidReport) {
      await sendReportReadyEmail({
        to: paidReport.payerEmail,
        name: paidReport.payerName,
        reportId,
        result: paidReport.result
      });
      emailSent = Boolean(paidReport.payerEmail);
    }
    state = "verified";
  } else if (params.status === "successful" && transactionId && txRef) {
    const verified = await verifyFlutterwavePayment(transactionId, txRef, getReportPrice());
    if (verified) {
      const paidReport = await markReportPaid(reportId, txRef, transactionId);
      if (paidReport) {
        await sendReportReadyEmail({
          to: paidReport.payerEmail,
          name: paidReport.payerName,
          reportId,
          result: paidReport.result
        });
        emailSent = Boolean(paidReport.payerEmail);
      }
      state = "verified";
    } else {
      state = "failed";
    }
  } else {
    state = "failed";
  }

  return (
    <main className="page">
      <div className="shell">
        <nav className="topbar">
          <div className="brand">
            <Image alt="Kuza Kizazi" className="brand-logo" height={48} src="/kuza-logo.png" width={48} priority />
            <span>CV Rank</span>
          </div>
        </nav>
        <section className="panel category">
          <h1 className="section-title">{copy[state].title}</h1>
          <p className="muted">{copy[state].body}</p>
          {emailSent ? <p className="muted">We also emailed the download link to the address used for payment.</p> : null}
          {txRef ? <p className="muted">Reference: {txRef}</p> : null}
          <div className="button-row">
            {state === "verified" && reportId ? (
              <a className="button" href={`/api/reports/${reportId}/download`}>
                Download PDF report
              </a>
            ) : null}
            <Link className="button secondary" href="/">
              Back to CV Rank
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

const copy = {
  verified: {
    title: "Payment verified",
    body: "Your full CV readiness report is ready to download."
  },
  failed: {
    title: "Payment could not be verified",
    body: "We could not verify a successful Flutterwave transaction for this report. Please try the payment again."
  },
  missing: {
    title: "Report not found",
    body: "This report may have expired or the payment link is missing the report reference. Please analyze the CV again."
  },
  pending: {
    title: "Payment pending",
    body: "We are waiting for Flutterwave confirmation."
  }
};
