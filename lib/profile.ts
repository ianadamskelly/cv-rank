import type { ProfileType, RubricContext } from "@/lib/types";
import { countAny, hasAny } from "@/lib/text-utils";

export const profileLabels: Record<ProfileType, string> = {
  student: "Student / Entry-level",
  "early-career": "Early career",
  professional: "Professional",
  creative: "Creative / Portfolio-based",
  freelancer: "Freelancer / Consultant",
  "career-changer": "Career changer"
};

export function detectProfile(context: Omit<RubricContext, "profileType">): ProfileType {
  const text = context.lowerText;
  const hasInternship = hasAny(text, ["intern", "attachment", "industrial training"]);
  const hasFreelance = hasAny(text, ["freelance", "consultant", "contract", "client", "retainer"]);
  const creativeSignals = countAny(text, [
    "portfolio",
    "behance",
    "dribbble",
    "photography",
    "videography",
    "graphic design",
    "brand design",
    "ui design",
    "content creator",
    "creative director",
    "copywriter"
  ]);
  const dataOrTechnicalSignals = hasAny(text, ["data analyst", "sql", "power bi", "python", "dashboard", "statistics"]);
  const hasCreative = creativeSignals >= 1 && !dataOrTechnicalSignals;
  const hasStudentSignals = hasAny(text, ["student", "graduate", "coursework", "gpa", "bachelor", "diploma", "university"]);
  const roleCount = countAny(text, ["manager", "officer", "specialist", "coordinator", "assistant", "engineer", "analyst", "director"]);

  if (hasFreelance && hasCreative) return "creative";
  if (hasFreelance) return "freelancer";
  if (hasCreative) return "creative";
  if (hasStudentSignals && (context.words.length < 550 || hasInternship) && !hasInternship) return "student";
  if (roleCount >= 3 && context.words.length > 550) return "professional";
  return "early-career";
}
