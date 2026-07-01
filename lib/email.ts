import { Resend } from "resend";
import type { AnalysisResult } from "@/lib/types";

export async function sendReportReadyEmail(input: {
  to?: string;
  name?: string;
  reportId: string;
  result: AnalysisResult;
}) {
  if (!input.to || !process.env.RESEND_API_KEY) return { skipped: true };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const downloadUrl = `${appUrl}/api/reports/${input.reportId}/download`;
  const from = process.env.RESEND_FROM || "CV Rank <onboarding@resend.dev>";

  return resend.emails.send({
    from,
    to: input.to,
    replyTo: process.env.RESEND_REPLY_TO || undefined,
    subject: `Your CV Rank report is ready (${input.result.overallScore}/100)`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#18310f;line-height:1.55">
        <img src="${appUrl}/kuza-logo.png" alt="Kuza Kizazi" style="width:72px;height:72px;margin-bottom:20px" />
        <h1 style="color:#18310f;margin:0 0 8px">Your CV readiness report is ready</h1>
        <p>Hello ${escapeHtml(input.name || "there")},</p>
        <p>Your CV was scored as <strong>${input.result.profileLabel}</strong> with a readiness score of <strong>${input.result.overallScore}/100</strong>.</p>
        <p>${escapeHtml(input.result.summary)}</p>
        <p><a href="${downloadUrl}" style="display:inline-block;background:#f58220;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Download your PDF report</a></p>
        <h2 style="font-size:18px;color:#18310f">Top fixes</h2>
        <ul>
          ${input.result.suggestions
            .slice(0, 4)
            .map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.action)}</li>`)
            .join("")}
        </ul>
        <p style="color:#667085">Use the report as a checklist. Only add claims, metrics, or skills that are true.</p>
      </div>
    `,
    text: `Your CV Rank report is ready. Score: ${input.result.overallScore}/100. Download: ${downloadUrl}`
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
