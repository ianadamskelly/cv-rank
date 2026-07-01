import { NextResponse } from "next/server";
import { detectProfile } from "@/lib/profile";
import { parseCvFile } from "@/lib/parser";
import { scoreCv } from "@/lib/rubrics";
import { saveReport } from "@/lib/report-store";
import { tokenize } from "@/lib/text-utils";
import type { ProfileType, RubricContext } from "@/lib/types";

export const runtime = "nodejs";

const profileTypes = new Set<ProfileType>([
  "student",
  "early-career",
  "professional",
  "creative",
  "freelancer",
  "career-changer"
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("cv");
    const profileTypeInput = String(formData.get("profileType") ?? "auto");
    const jobDescription = String(formData.get("jobDescription") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a CV file first." }, { status: 400 });
    }

    const parsedCv = await parseCvFile(file);
    const words = tokenize(parsedCv.text);
    const baseContext = {
      text: parsedCv.text,
      lowerText: parsedCv.text.toLowerCase(),
      words,
      jobDescription,
      parseConfidence: parsedCv.parseConfidence
    };
    const profileType =
      profileTypes.has(profileTypeInput as ProfileType) ? (profileTypeInput as ProfileType) : detectProfile(baseContext);

    const context: RubricContext = {
      ...baseContext,
      profileType
    };

    const result = scoreCv(context, parsedCv.warnings);
    await saveReport(result);

    return NextResponse.json(result);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not analyze this CV.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
