"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { AnalysisResult, ProfileType } from "@/lib/types";

const profileOptions: { label: string; value: ProfileType | "auto" }[] = [
  { label: "Auto-detect profile", value: "auto" },
  { label: "Student / Entry-level", value: "student" },
  { label: "Early career", value: "early-career" },
  { label: "Professional", value: "professional" },
  { label: "Creative / Portfolio-based", value: "creative" },
  { label: "Freelancer / Consultant", value: "freelancer" },
  { label: "Career changer", value: "career-changer" }
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [profileType, setProfileType] = useState<ProfileType | "auto">("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const fileLabel = useMemo(() => {
    if (!file) return "PDF or DOCX, up to 8MB";
    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);

  async function analyzeCv() {
    if (!file) {
      setError("Choose a CV file first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("cv", file);
    formData.append("jobDescription", jobDescription);
    formData.append("profileType", profileType);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not analyze this CV.");
      }

      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <nav className="topbar" aria-label="Main navigation">
          <div className="brand">
            <Image alt="Kuza Kizazi" className="brand-logo" height={48} src="/kuza-logo.png" width={48} priority />
            <span>CV Rank</span>
          </div>
          <a className="button secondary" href={process.env.NEXT_PUBLIC_CV_BUILDER_URL ?? "https://cv.kuzakizazi.com"}>
            Create a CV
          </a>
        </nav>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Kuza Kizazi CV readiness checker</p>
            <h1>Make your CV shortlist-ready.</h1>
            <p>
              Upload your CV and get a clear, practical review of its structure, evidence, role fit, and ATS readability.
              The feedback is profile-aware, honest, and focused on helping you improve without inventing experience.
            </p>
          </div>

          <section className="panel upload-panel" aria-label="Upload CV">
            <label className="dropzone">
              <input
                accept=".pdf,.docx"
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span>
                <strong>{file ? "Selected CV" : "Tap or click to upload your CV"}</strong>
                {fileLabel}
              </span>
            </label>

            <div className="form-row">
              <label htmlFor="profile">Profile type</label>
              <select
                id="profile"
                value={profileType}
                onChange={(event) => setProfileType(event.target.value as ProfileType | "auto")}
              >
                {profileOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="jobDescription">Job description, optional</label>
              <textarea
                id="jobDescription"
                placeholder="Paste a job description if you want the CV checked against a specific role."
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
              />
            </div>

            {error ? <p className="muted">{error}</p> : null}

            <div className="button-row">
              <button className="button" disabled={isLoading} type="button" onClick={analyzeCv}>
                {isLoading ? "Reviewing CV..." : "Review my CV"}
              </button>
            </div>
          </section>
        </section>

        <section className="trust-strip" aria-label="Product principles">
          <div className="trust-item">No account required.</div>
          <div className="trust-item">English CVs supported.</div>
          <div className="trust-item">Profile-specific scoring.</div>
          <div className="trust-item">Practical suggestions, no fake rewriting.</div>
        </section>

        {result ? <Results result={result} /> : null}

        <footer className="footer">
          <span>All rights by Kuza Kizazi 2026.</span>
          <a
            aria-label="Follow BOBS ABROAD on Facebook"
            className="social-link"
            href="https://www.facebook.com/groups/iandesignagency"
            rel="noreferrer"
            target="_blank"
          >
            <span className="facebook-icon" aria-hidden="true">
              f
            </span>
            BOBS ABROAD job postings
          </a>
        </footer>
      </div>
    </main>
  );
}

function Results({ result }: { result: AnalysisResult }) {
  const builderUrl = process.env.NEXT_PUBLIC_CV_BUILDER_URL ?? "https://cv.kuzakizazi.com";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  async function startPayment() {
    if (!email) {
      setPaymentError("Enter an email address for the payment receipt.");
      return;
    }

    setIsPaying(true);
    setPaymentError("");

    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reportId: result.reportId,
          email,
          name
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not start payment.");
      if (!payload.paymentLink) throw new Error("Flutterwave did not return a payment link.");
      window.location.href = payload.paymentLink;
    } catch (caught) {
      setPaymentError(caught instanceof Error ? caught.message : "Could not start payment.");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <section className="results" aria-label="CV analysis results">
      <div className="panel score-band">
        <div className="score-circle" aria-label={`CV readiness score ${result.overallScore} out of 100`}>
          <span>
            <strong>{result.overallScore}</strong>/100
          </span>
        </div>
        <div>
          <p className="pill">{result.profileLabel}</p>
          <h2 className="section-title">CV Readiness Score</h2>
          <p className="muted">{result.summary}</p>
          <div className="button-row">
            <a className="button secondary" href="#paid-report">
              Get full PDF report
            </a>
            <a className="button secondary" href={builderUrl}>
              Build or fix your CV
            </a>
          </div>
        </div>
      </div>

      {result.parseWarning ? (
        <div className="panel alert">
          <strong>ATS readability risk</strong>
          <p className="muted">{result.parseWarning}</p>
        </div>
      ) : null}

      <div className="grid">
        {result.categories.map((category) => (
          <article className="panel category" key={category.name}>
            <header>
              <strong>{category.name}</strong>
              <span className="pill">{category.score}/100</span>
            </header>
            <div className="progress" aria-hidden="true">
              <span style={{ width: `${category.score}%` }} />
            </div>
            <p className="microcopy">{category.whatThisMeans}</p>
            <p className="muted">{category.summary}</p>
            <div className="check-row">
              <span>{category.checks.filter((check) => check.passed).length} passed</span>
              <span>{category.checks.filter((check) => !check.passed).length} to improve</span>
            </div>
            {category.improvements[0] ? (
              <div className="mini-fix">
                <strong>{category.improvements[0].title}</strong>
                <span>{category.improvements[0].action}</span>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="panel category">
        <h2 className="section-title">Priority fixes</h2>
        <ul className="feedback-list">
          {result.suggestions.map((suggestion) => (
            <li key={suggestion.title}>
              <span className={`priority ${suggestion.priority}`}>{suggestion.priority}</span>
              <strong>{suggestion.title}</strong>
              <p>{suggestion.detail}</p>
              <p>{suggestion.action}</p>
              {suggestion.example ? <em>Example: {suggestion.example}</em> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel category">
        <h2 className="section-title">What is already working</h2>
        <ul className="strength-list">
          {result.strengths.map((strength) => (
            <li key={strength}>{strength}</li>
          ))}
        </ul>
      </div>

      <div className="panel cta">
        <div>
          <h2 className="section-title">Need a cleaner CV structure?</h2>
          <p className="muted">
            If the review flags formatting, missing sections, or weak evidence, rebuild your CV on the Kuza Kizazi CV
            builder and use these suggestions as your checklist.
          </p>
        </div>
        <a className="button" href={builderUrl}>
          Open CV builder
        </a>
      </div>

      <div className="panel category" id="paid-report">
        <h2 className="section-title">Download the full PDF report</h2>
        <p className="muted">
          The PDF includes the full category breakdown, priority fixes, examples, strengths, and a section-by-section
          improvement checklist.
        </p>
        <div className="payment-grid">
          <div className="form-row">
            <label htmlFor="payerName">Name, optional</label>
            <input id="payerName" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="form-row">
            <label htmlFor="payerEmail">Email for receipt</label>
            <input
              id="payerEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>
        {paymentError ? <p className="muted">{paymentError}</p> : null}
        <div className="button-row">
          <button className="button" disabled={isPaying} type="button" onClick={startPayment}>
            {isPaying ? "Opening secure checkout..." : "Pay and download PDF"}
          </button>
        </div>
      </div>
    </section>
  );
}
