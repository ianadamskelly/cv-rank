const productionAppUrl = "https://www.cvrank.kuzakizazi.com";
const nonWwwAppUrl = "https://cvrank.kuzakizazi.com";

export function getAppUrl() {
  const fallback = process.env.NODE_ENV === "production" ? productionAppUrl : "http://localhost:3000";
  const configured = (process.env.NEXT_PUBLIC_APP_URL || fallback).replace(/\/+$/, "");

  return configured === nonWwwAppUrl ? productionAppUrl : configured;
}
