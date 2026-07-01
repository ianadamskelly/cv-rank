import fs from "node:fs/promises";
import path from "node:path";
import type { AnalysisResult } from "@/lib/types";

type StoredReport = {
  result: AnalysisResult;
  paid: boolean;
  txRef?: string;
  transactionId?: string;
  payerEmail?: string;
  payerName?: string;
  createdAt: string;
  expiresAt: string;
};

type ReportDatabase = Record<string, StoredReport>;

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "reports.json");
const reportTtlMs = 72 * 60 * 60 * 1000;

export async function saveReport(result: AnalysisResult) {
  const db = await readDb();
  db[result.reportId] = {
    result,
    paid: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + reportTtlMs).toISOString()
  };
  await writeDb(cleanExpired(db));
}

export async function getReport(reportId: string) {
  const db = cleanExpired(await readDb());
  await writeDb(db);
  return db[reportId];
}

export async function markReportPaymentStarted(reportId: string, txRef: string, payerEmail: string, payerName?: string) {
  const db = await readDb();
  const report = db[reportId];
  if (!report) return null;
  report.txRef = txRef;
  report.payerEmail = payerEmail;
  report.payerName = payerName;
  await writeDb(cleanExpired(db));
  return report;
}

export async function markReportPaid(reportId: string, txRef: string, transactionId?: string) {
  const db = await readDb();
  const report = db[reportId];
  if (!report) return null;
  report.paid = true;
  report.txRef = txRef;
  report.transactionId = transactionId;
  report.result.reportPaid = true;
  await writeDb(cleanExpired(db));
  return report;
}

async function readDb(): Promise<ReportDatabase> {
  try {
    const content = await fs.readFile(dataFile, "utf8");
    return JSON.parse(content) as ReportDatabase;
  } catch {
    return {};
  }
}

async function writeDb(db: ReportDatabase) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(db, null, 2));
}

function cleanExpired(db: ReportDatabase) {
  const now = Date.now();
  return Object.fromEntries(Object.entries(db).filter(([, report]) => new Date(report.expiresAt).getTime() > now));
}
