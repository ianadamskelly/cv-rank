const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const phonePattern = /(?:\+?\d[\d\s().-]{7,}\d)/;
const urlPattern = /(https?:\/\/|www\.|linkedin\.com|github\.com|behance\.net|dribbble\.com|portfolio)/i;
const datePattern = /\b(20\d{2}|19\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current)\b/i;
const metricPattern =
  /\b(\d+%|\d+\+|\$|kes|ksh|usd|£|€|\d+\s?(clients|users|customers|students|projects|sales|revenue|team|people|staff|months|years|days|hours|campaigns|branches|regions|followers|engagement|budget|leads))\b/i;
const bulletPattern = /(^|\n)\s*([•*-]|\d+[.)])\s+/;
const pronounPattern = /\b(i|me|my|mine|we|our)\b/i;

export const actionVerbs = [
  "achieved",
  "administered",
  "analyzed",
  "built",
  "coordinated",
  "created",
  "designed",
  "developed",
  "delivered",
  "executed",
  "facilitated",
  "improved",
  "increased",
  "launched",
  "led",
  "managed",
  "measured",
  "optimized",
  "organized",
  "produced",
  "reduced",
  "resolved",
  "streamlined",
  "supported",
  "trained"
];

export const weakPhrases = [
  "hardworking",
  "go getter",
  "works under pressure",
  "team player",
  "self motivated",
  "detail oriented",
  "results driven",
  "dynamic individual"
];

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function hasEmail(text: string) {
  return emailPattern.test(text);
}

export function hasPhone(text: string) {
  return phonePattern.test(text);
}

export function hasProfessionalLink(text: string) {
  return urlPattern.test(text);
}

export function hasDates(text: string) {
  return datePattern.test(text);
}

export function hasMetrics(text: string) {
  return metricPattern.test(text);
}

export function hasBullets(text: string) {
  return bulletPattern.test(text);
}

export function hasPersonalPronouns(text: string) {
  return pronounPattern.test(text);
}

export function hasAny(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  return terms.some((term) => lowerText.includes(term));
}

export function countAny(text: string, terms: string[]) {
  const lowerText = text.toLowerCase();
  return terms.reduce((count, term) => count + (lowerText.includes(term) ? 1 : 0), 0);
}

export function keywordOverlap(cvWords: string[], jobDescription?: string) {
  if (!jobDescription?.trim()) return 1;
  const ignored = new Set(["and", "the", "with", "for", "you", "our", "are", "will", "from", "this", "that"]);
  const cv = new Set(cvWords);
  const jdWords = tokenize(jobDescription).filter((word) => word.length > 3 && !ignored.has(word));
  const uniqueJdWords = [...new Set(jdWords)].slice(0, 80);
  if (uniqueJdWords.length === 0) return 1;
  const matches = uniqueJdWords.filter((word) => cv.has(word)).length;
  return matches / uniqueJdWords.length;
}

export function countKeywordOverlap(cvWords: string[], terms: string[]) {
  const cv = new Set(cvWords);
  return terms.filter((term) => cv.has(term)).length;
}

export function extractJobKeywords(jobDescription?: string) {
  if (!jobDescription?.trim()) return [];
  const ignored = new Set([
    "about",
    "also",
    "and",
    "are",
    "can",
    "for",
    "from",
    "have",
    "our",
    "that",
    "the",
    "this",
    "with",
    "will",
    "work",
    "your"
  ]);
  return [...new Set(tokenize(jobDescription).filter((word) => word.length > 3 && !ignored.has(word)))].slice(0, 30);
}
