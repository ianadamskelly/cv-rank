import crypto from "node:crypto";
import type { AnalysisResult, FeedbackItem, ProfileType, RubricCategory, RubricContext } from "@/lib/types";
import {
  actionVerbs,
  extractJobKeywords,
  hasAny,
  hasBullets,
  hasDates,
  hasEmail,
  hasImpactMetrics,
  hasLinkedInExportArtifacts,
  hasOutcomeLanguage,
  hasPersonalPronouns,
  hasPhone,
  hasProfessionalLink,
  keywordOverlap,
  weakPhrases
} from "@/lib/text-utils";
import { profileLabels } from "@/lib/profile";

const sections = {
  identity: ["summary", "profile", "objective", "about"],
  experience: ["experience", "employment", "work history", "professional experience", "internship"],
  education: ["education", "university", "college", "degree", "diploma", "certificate"],
  skills: ["skills", "tools", "technologies", "competencies", "software"],
  projects: ["projects", "portfolio", "selected work", "case studies", "clients"],
  certifications: ["certification", "certificate", "training", "course", "license"]
};

const commonCategories: RubricCategory[] = [
  {
    name: "ATS readability",
    description: "Whether the CV can be parsed, skimmed, and understood by screening systems and recruiters.",
    checks: [
      check("Readable extracted text", 20, ({ words }) => words.length >= 180, "The CV has enough readable text to analyze.", {
        title: "Make the CV text-readable",
        detail:
          "Very little text was extracted. This often happens with scanned PDFs, image-based designs, or heavy layout effects. ATS tools may miss important content.",
        action: "Export a text-based PDF or DOCX from a simple CV builder, then avoid flattened images for body text.",
        priority: "high"
      }),
      check(
        "Standard section headings",
        20,
        ({ lowerText }) =>
          hasAny(lowerText, sections.experience) && hasAny(lowerText, sections.education) && hasAny(lowerText, sections.skills),
        "The main sections are easy to identify.",
        {
          title: "Use standard CV section headings",
          detail: "Recruiters and ATS parsers look for familiar section names before they interpret the details beneath them.",
          action: "Use headings such as Profile, Skills, Experience, Education, Projects, and Certifications.",
          priority: "high"
        }
      ),
      check("Dates are visible", 15, ({ text }) => hasDates(text), "Dates are present for chronology.", {
        title: "Add dates to roles and education",
        detail: "Missing dates make it difficult to understand experience level, career progression, and recency.",
        action: "Add month/year or year ranges for roles, internships, projects, education, and certifications.",
        example: "Marketing Intern | ABC Ltd | May 2024 - Aug 2024",
        priority: "medium"
      }),
      check("Bullet structure", 15, ({ text }) => hasBullets(text), "The CV uses bullet-like structure for fast scanning.", {
        title: "Use concise bullets for responsibilities and results",
        detail: "Dense paragraphs are harder to skim. Bullets make achievements easier to compare.",
        action: "Use 3-6 bullets under each role or project, with each bullet focused on one contribution.",
        priority: "medium"
      }),
      check("Appropriate length", 15, ({ words }) => words.length >= 220 && words.length <= 1400, "The CV length is within a usable range.", {
        title: "Control the CV length",
        detail: "Too little detail weakens evidence. Too much detail hides the strongest points.",
        action: "Aim for one page for students and early-career profiles, and one to two pages for experienced professionals.",
        priority: "medium"
      }),
      check("Clean export format", 15, ({ text }) => !hasLinkedInExportArtifacts(text), "The CV does not show obvious export artifacts.", {
        title: "Clean up LinkedIn-export formatting",
        detail:
          "The extracted text looks like it may come from a LinkedIn profile export, with page labels or sidebar content mixed into the reading order. That can make screening systems and recruiters see information in the wrong sequence.",
        action: "Rebuild the CV as a dedicated one-to-two page CV with a clear header, summary, skills, experience, education, and project/portfolio sections.",
        priority: "high"
      }),
      check("Low parser risk", 15, ({ parseConfidence }) => parseConfidence !== "low", "The file appears reasonably parseable.", {
        title: "Reduce ATS formatting risk",
        detail: "The parser confidence is low, which suggests the format may also be difficult for some ATS systems.",
        action: "Avoid complex tables, text boxes, icons as labels, multi-column body content, and scanned pages.",
        priority: "high"
      })
    ]
  },
  {
    name: "Contact and credibility",
    description: "Whether the CV gives employers enough trustworthy information to contact and verify the candidate.",
    checks: [
      check("Professional email", 20, ({ text }) => hasEmail(text), "A professional email is present.", {
        title: "Add a professional email address",
        detail: "A missing email creates avoidable friction for recruiters.",
        action: "Place a simple professional email near your name at the top of the CV.",
        priority: "high"
      }),
      check("Phone number", 18, ({ text }) => hasPhone(text), "A phone number is present.", {
        title: "Add a reachable phone number",
        detail: "Recruiters often move quickly. A missing phone number can delay follow-up.",
        action: "Add your current phone number, preferably with country code if applying internationally.",
        priority: "high"
      }),
      check("Professional link", 18, ({ text }) => hasProfessionalLink(text), "A relevant professional link is present.", {
        title: "Add a professional link",
        detail: "A LinkedIn, portfolio, GitHub, Behance, or website link gives proof beyond the CV.",
        action: "Add the most relevant link for your field and make sure it is public and up to date.",
        priority: "medium"
      }),
      check("Location context", 12, ({ lowerText }) => hasAny(lowerText, ["nairobi", "kenya", "remote", "hybrid", "relocation"]), "Location or work-mode context is present.", {
        title: "Clarify location or work mode",
        detail: "Location helps employers understand availability, logistics, and market fit.",
        action: "Add city/country or work mode if it matters for the roles you are targeting.",
        priority: "low"
      }),
      check("No personal pronoun style", 12, ({ text }) => !hasPersonalPronouns(text), "The CV uses a professional, concise style.", {
        title: "Reduce first-person wording",
        detail: "CVs usually read stronger when written in concise fragments rather than first-person sentences.",
        action: "Remove phrases like 'I was responsible for' and start with the contribution instead.",
        example: "Instead of 'I managed client accounts', use 'Managed client accounts across retail and hospitality sectors.'",
        priority: "low"
      }),
      check("Credibility signals", 20, ({ lowerText }) => hasAny(lowerText, ["award", "certification", "license", "publication", "client", "portfolio", "github", "linkedin"]), "The CV includes at least one credibility signal.", {
        title: "Add proof signals",
        detail: "Employers trust claims more when they see external proof such as certificates, awards, public work, or credible clients.",
        action: "Include relevant certifications, portfolio links, awards, publications, or client/project names where appropriate.",
        priority: "medium"
      })
    ]
  },
  {
    name: "Profile positioning",
    description: "Whether the top of the CV quickly explains who the person is and what direction they are targeting.",
    checks: [
      check("Profile summary exists", 25, ({ lowerText }) => hasAny(lowerText, sections.identity), "The CV has a top-level summary or profile section.", {
        title: "Add a focused profile summary",
        detail: "The first few lines should help a recruiter understand your level, field, and value.",
        action: "Write 2-4 lines covering role identity, strongest evidence, tools/domain, and target direction.",
        example: "Data analyst with internship experience in reporting, Excel, SQL, and dashboarding for operations teams.",
        priority: "high"
      }),
      check("Target role language", 20, ({ lowerText }) => hasAny(lowerText, ["analyst", "developer", "designer", "teacher", "marketer", "accountant", "engineer", "officer", "manager", "assistant", "consultant"]), "The CV includes recognizable role language.", {
        title: "Make the target role obvious",
        detail: "A general CV forces employers to guess what role you fit.",
        action: "Use the target job family in the headline or summary, such as Junior Accountant, UX Designer, or Operations Officer.",
        priority: "high"
      }),
      check("Skills near the top", 20, ({ lowerText }) => hasAny(lowerText, sections.skills), "A skills section is available for quick scanning.", {
        title: "Add a clear skills section",
        detail: "A skills section helps both recruiters and ATS tools quickly connect the CV to role requirements.",
        action: "Group skills by type, such as Technical, Tools, Languages, Domain Knowledge, or Creative Software.",
        priority: "medium"
      }),
      check("Avoids generic adjectives", 15, ({ lowerText }) => !hasAny(lowerText, weakPhrases), "The CV avoids common unsupported claims.", {
        title: "Replace generic claims with evidence",
        detail: "Phrases like 'hardworking' and 'team player' are common but weak unless supported by examples.",
        action: "Replace soft claims with proof from roles, projects, leadership, or measurable outcomes.",
        priority: "medium"
      }),
      check("Relevant specialization", 20, ({ lowerText }) => hasAny(lowerText, ["sector", "industry", "domain", "specialist", "specialized", "focus", "portfolio", "operations", "finance", "education", "health", "sales", "software", "design"]), "The CV gives some specialization context.", {
        title: "Show your specialization",
        detail: "Employers compare candidates by fit, not just general ability.",
        action: "Mention the sectors, tools, audiences, or problem areas where your experience is strongest.",
        priority: "medium"
      })
    ]
  },
  {
    name: "Evidence and impact",
    description: "Whether the CV proves value through actions, outcomes, scale, and clear contribution.",
    checks: [
      check("Action verbs", 18, ({ lowerText }) => actionVerbs.some((verb) => lowerText.includes(verb)), "The CV uses action-led language.", {
        title: "Start bullets with stronger action verbs",
        detail: "Action verbs make contributions clearer and reduce passive wording.",
        action: "Begin bullets with verbs such as led, built, analyzed, improved, coordinated, delivered, or trained.",
        priority: "medium"
      }),
      check("Quantified outcomes", 25, ({ text }) => hasImpactMetrics(text), "The CV includes measurable evidence.", {
        title: "Add numbers and scale",
        detail: "Metrics make achievements more credible and help employers understand scope.",
        action: "Add numbers where true: volume, users, clients, revenue, cost, time saved, engagement, team size, or frequency.",
        example: "Coordinated weekly reports for 6 branches, reducing manual follow-up time by 30%.",
        priority: "high"
      }),
      check("Outcome language", 18, ({ text }) => hasOutcomeLanguage(text), "The CV explains results, not only tasks.", {
        title: "Connect tasks to outcomes",
        detail: "Responsibility-only bullets show activity, but outcome bullets show value.",
        action: "Use a structure like Action + Scope + Result wherever possible.",
        example: "Improved onboarding checklist for new interns, reducing repeated setup questions in the first week.",
        priority: "high"
      }),
      check("Scope of work", 14, ({ lowerText }) => hasAny(lowerText, ["team", "client", "users", "customers", "budget", "branches", "projects", "campaigns", "reports", "systems"]), "The CV gives scope for some responsibilities.", {
        title: "Show the scale of your work",
        detail: "Scope helps employers understand whether your experience is small, complex, repeated, or high responsibility.",
        action: "Add the number of clients, projects, reports, campaigns, users, staff, regions, or systems involved.",
        priority: "medium"
      }),
      check("Specific tools or methods", 15, ({ lowerText }) => hasAny(lowerText, ["excel", "sql", "python", "figma", "adobe", "canva", "crm", "quickbooks", "power bi", "tableau", "google analytics", "trello", "jira"]), "The CV names concrete tools or methods.", {
        title: "Name the tools behind your work",
        detail: "Specific tools make skills verifiable and improve matching for technical or tool-based roles.",
        action: "Add relevant software, platforms, frameworks, equipment, or methods used in your work.",
        priority: "medium"
      }),
      check("No responsibility-only wording", 10, ({ lowerText }) => !hasAny(lowerText, ["responsible for", "duties included", "tasked with"]), "The CV avoids weak responsibility-led phrasing.", {
        title: "Rewrite responsibility-led bullets",
        detail: "Phrases like 'responsible for' hide the actual contribution.",
        action: "Lead with what you did, who/what it affected, and what changed.",
        example: "Instead of 'Responsible for social media', use 'Created weekly social posts for 3 product lines, improving campaign consistency.'",
        priority: "medium"
      })
    ]
  },
  {
    name: "Role alignment",
    description: "How well the CV connects to a target role, especially when a job description is supplied.",
    checks: [
      check("Target keyword match", 0, ({ words, jobDescription }) => !jobDescription?.trim() || keywordOverlap(words, jobDescription) >= 0.22, "No target job description was supplied, so keyword matching was treated as neutral.", {
        title: "Tailor keywords to the job description",
        detail: "When a job description is provided, the CV should naturally reflect important skills and responsibilities that truthfully match your background.",
        action: "Add matching tools, responsibilities, and domain terms from the job description where they are accurate.",
        priority: "high"
      }),
      check("Required skills visible", 20, ({ lowerText }) => hasAny(lowerText, sections.skills), "Skills are visible for matching.", {
        title: "Make required skills easy to find",
        detail: "Recruiters often scan for required skills before reading every bullet.",
        action: "Create a skills section and repeat the most important skills in relevant experience bullets.",
        priority: "high"
      }),
      check("Role context", 15, ({ lowerText }) => hasAny(lowerText, ["summary", "objective", "profile", "target", "career"]), "The CV includes role direction near the top.", {
        title: "State the role direction",
        detail: "The CV should not read like a generic archive of everything you have done.",
        action: "Use the top summary to frame the role you are applying for and the evidence that supports it.",
        priority: "medium"
      }),
      check("Relevant examples", 20, ({ lowerText }) => hasAny(lowerText, ["project", "experience", "case study", "campaign", "client", "achievement"]), "The CV contains examples that can be mapped to role requirements.", {
        title: "Add role-relevant examples",
        detail: "Skills are stronger when backed by where and how they were used.",
        action: "Under roles or projects, add examples that prove the most important job requirements.",
        priority: "medium"
      }),
      check("Certifications or training", 15, ({ lowerText }) => hasAny(lowerText, sections.certifications), "Relevant learning signals are present.", {
        title: "Add relevant training or certifications",
        detail: "Training helps close trust gaps, especially for entry-level candidates and career changers.",
        action: "Add current, relevant courses, licenses, certifications, or workshops.",
        priority: "low"
      })
    ]
  }
];

const profileCategories: Record<ProfileType, RubricCategory[]> = {
  student: [
    {
      name: "Education and early proof",
      description: "How well a student or fresh graduate turns limited experience into credible evidence.",
      checks: [
        check("Education detail", 25, ({ lowerText }) => hasAny(lowerText, sections.education), "Education is clearly presented.", {
          title: "Make education do more work",
          detail: "For students, education is often the strongest proof of readiness.",
          action: "Include qualification, institution, dates, relevant coursework, academic projects, honors, or leadership.",
          priority: "high"
        }),
        check("Projects included", 25, ({ lowerText }) => hasAny(lowerText, ["project", "coursework", "capstone", "research", "prototype"]), "Projects provide practical proof.", {
          title: "Add academic or personal projects",
          detail: "Projects help replace missing full-time experience with evidence of applied ability.",
          action: "Add project title, problem, tools used, your contribution, and outcome.",
          priority: "high"
        }),
        check("Internship or attachment", 20, ({ lowerText }) => hasAny(lowerText, ["intern", "attachment", "industrial training", "volunteer"]), "Early workplace exposure is visible.", {
          title: "Include internships, attachment, or volunteering",
          detail: "Employers look for signals that you have operated beyond the classroom.",
          action: "Add internships, industrial attachment, volunteering, clubs, leadership roles, or community projects.",
          priority: "medium"
        }),
        check("Leadership or activities", 15, ({ lowerText }) => hasAny(lowerText, ["leader", "club", "society", "captain", "committee", "mentor", "volunteer"]), "Leadership or activity signals are present.", {
          title: "Show leadership and initiative",
          detail: "Activities can demonstrate responsibility, communication, and reliability.",
          action: "Include student leadership, clubs, competitions, mentoring, organizing, or volunteering.",
          priority: "medium"
        }),
        check("Entry-level length", 15, ({ words }) => words.length <= 850, "The CV is concise enough for entry-level applications.", {
          title: "Keep the entry-level CV focused",
          detail: "A long student CV often hides the strongest evidence.",
          action: "Prioritize education, projects, internships, skills, and leadership. Remove unrelated filler.",
          priority: "low"
        })
      ]
    }
  ],
  "early-career": [
    {
      name: "Early-career growth",
      description: "How well junior experience shows learning, reliability, and practical contribution.",
      checks: [
        check("Recent role clarity", 25, ({ lowerText }) => hasAny(lowerText, ["intern", "assistant", "junior", "officer", "associate", "trainee"]), "Junior roles are identifiable.", {
          title: "Clarify your junior roles",
          detail: "Early-career CVs need clear titles, organizations, and dates so employers can understand your level.",
          action: "List each role with title, organization, dates, and 3-5 contribution bullets.",
          priority: "high"
        }),
        check("Learning progression", 20, ({ lowerText }) => hasAny(lowerText, ["trained", "learned", "promoted", "improved", "supported", "assisted", "owned"]), "The CV shows growth from support to ownership.", {
          title: "Show progression and learning",
          detail: "Employers hiring junior talent want evidence that you learn quickly and take responsibility.",
          action: "Add examples where you improved, learned a tool, supported a team, or took ownership of a task.",
          priority: "medium"
        }),
        check("Practical tools", 20, ({ lowerText }) => hasAny(lowerText, ["excel", "google workspace", "crm", "canva", "sql", "figma", "quickbooks", "power bi", "software"]), "Practical tools are visible.", {
          title: "List the tools you can already use",
          detail: "Junior candidates become more credible when employers see ready-to-use tools.",
          action: "Add the tools, platforms, or systems you used in internships, projects, or first roles.",
          priority: "medium"
        }),
        check("Workplace contribution", 20, ({ text }) => hasImpactMetrics(text), "Some contribution is quantified.", {
          title: "Add contribution evidence",
          detail: "Even junior work can be quantified by volume, frequency, turnaround time, or number of people supported.",
          action: "Add numbers such as reports prepared weekly, customers served, records updated, or campaigns supported.",
          priority: "high"
        }),
        check("Concise junior CV", 15, ({ words }) => words.length <= 1000, "The CV is focused for early-career applications.", {
          title: "Keep early-career detail focused",
          detail: "A junior CV should be easy to scan and centered on recent, relevant proof.",
          action: "Remove old or unrelated details that do not support the next role.",
          priority: "low"
        })
      ]
    }
  ],
  professional: [
    {
      name: "Professional progression",
      description: "How well the CV shows career movement, ownership, and measurable business value.",
      checks: [
        check("Chronological roles", 20, ({ text, lowerText }) => hasDates(text) && hasAny(lowerText, sections.experience), "Career chronology is visible.", {
          title: "Strengthen the career timeline",
          detail: "Professional CVs are judged heavily on progression, recency, and scope.",
          action: "Show roles in reverse chronological order with dates, titles, organizations, and scope.",
          priority: "high"
        }),
        check("Leadership or ownership", 20, ({ lowerText }) => hasAny(lowerText, ["led", "managed", "supervised", "owned", "oversaw", "coordinated", "directed"]), "Ownership signals are present.", {
          title: "Show ownership and leadership",
          detail: "Experienced candidates need to prove not only participation, but responsibility.",
          action: "Add examples of teams led, processes owned, budgets managed, decisions made, or stakeholders coordinated.",
          priority: "high"
        }),
        check("Business impact", 25, ({ text }) => hasImpactMetrics(text), "Business impact is quantified.", {
          title: "Quantify professional impact",
          detail: "Professional CVs become stronger when they show outcomes, not only job descriptions.",
          action: "Add metrics for cost, revenue, turnaround time, quality, compliance, team output, or customer outcomes.",
          priority: "high"
        }),
        check("Industry context", 15, ({ lowerText }) => hasAny(lowerText, ["industry", "sector", "market", "clients", "operations", "compliance", "stakeholders"]), "Industry context is visible.", {
          title: "Add industry and operating context",
          detail: "Context helps employers compare your experience to their environment.",
          action: "Mention sectors, customer types, markets, departments, regulations, or operating scale.",
          priority: "medium"
        }),
        check("Seniority fit", 20, ({ lowerText }) => hasAny(lowerText, ["strategy", "budget", "team", "stakeholder", "reporting", "operations", "performance"]), "The CV includes seniority signals.", {
          title: "Make seniority visible",
          detail: "For professional roles, employers look for scope, judgment, coordination, and outcomes.",
          action: "Add evidence of strategy, budgets, reporting lines, performance ownership, or stakeholder management.",
          priority: "medium"
        })
      ]
    }
  ],
  creative: [
    {
      name: "Creative proof",
      description: "How well a creative CV proves work quality, tools, clients, portfolio, and outcomes.",
      checks: [
        check("Portfolio link", 25, ({ text }) => hasProfessionalLink(text), "A portfolio or public work link is present.", {
          title: "Add a portfolio link",
          detail: "Creative hiring depends heavily on seeing the work, not just reading about it.",
          action: "Add a portfolio, Behance, Dribbble, website, GitHub, YouTube, Instagram, or case-study link depending on your field.",
          priority: "high"
        }),
        check("Selected projects", 22, ({ lowerText }) => hasAny(lowerText, ["project", "campaign", "case study", "selected work", "brief"]), "Selected work is described.", {
          title: "Describe selected creative projects",
          detail: "A creative CV should show what you made, who it was for, and what changed.",
          action: "Add project name, client/brief, your role, tools, deliverables, and result.",
          priority: "high"
        }),
        check("Client or audience context", 18, ({ lowerText }) => hasAny(lowerText, ["client", "brand", "audience", "campaign", "followers", "engagement"]), "Client or audience context is present.", {
          title: "Add client or audience context",
          detail: "Creative work is stronger when the reader understands who it served.",
          action: "Mention client type, audience, brand, campaign objective, or channel.",
          priority: "medium"
        }),
        check("Creative tools", 20, ({ lowerText }) => hasAny(lowerText, ["adobe", "photoshop", "illustrator", "premiere", "after effects", "figma", "canva", "lightroom", "davinci"]), "Creative tools are named.", {
          title: "List creative tools and production skills",
          detail: "Tool fluency matters in many creative roles.",
          action: "Group tools by design, video, photography, content, UX, motion, or publishing.",
          priority: "medium"
        }),
        check("Creative outcomes", 15, ({ text }) => hasImpactMetrics(text), "Creative outcomes are quantified.", {
          title: "Add creative performance outcomes",
          detail: "Metrics help show the business or audience value of creative work.",
          action: "Add reach, engagement, conversion, assets delivered, campaigns launched, turnaround time, or audience growth.",
          priority: "medium"
        })
      ]
    }
  ],
  freelancer: [
    {
      name: "Client credibility",
      description: "How well a freelancer or consultant proves services, clients, scope, and results.",
      checks: [
        check("Services are clear", 22, ({ lowerText }) => hasAny(lowerText, ["services", "consulting", "freelance", "contract", "consultant"]), "Services are clear.", {
          title: "State your services clearly",
          detail: "Freelance CVs should quickly explain what you can be hired to do.",
          action: "Add a services line such as Brand Design, Social Media Management, Bookkeeping, Web Development, or HR Consulting.",
          priority: "high"
        }),
        check("Client/project examples", 25, ({ lowerText }) => hasAny(lowerText, ["client", "project", "contract", "retainer", "case study"]), "Client or project examples are visible.", {
          title: "Add client and project examples",
          detail: "Freelance credibility comes from proof of completed work.",
          action: "List representative projects with client type, scope, duration, deliverables, and results.",
          priority: "high"
        }),
        check("Results delivered", 23, ({ text }) => hasImpactMetrics(text), "Results are quantified.", {
          title: "Show results delivered",
          detail: "A freelancer needs to show outcomes that justify trust.",
          action: "Add metrics such as clients served, projects delivered, revenue influenced, turnaround time, retention, or performance.",
          priority: "high"
        }),
        check("Portfolio or website", 15, ({ text }) => hasProfessionalLink(text), "A portfolio or website is present.", {
          title: "Add a proof link",
          detail: "A link lets prospects verify your work quickly.",
          action: "Add a portfolio, website, LinkedIn, GitHub, Behance, or relevant social proof page.",
          priority: "medium"
        }),
        check("Repeatability signal", 15, ({ lowerText }) => hasAny(lowerText, ["retainer", "repeat", "monthly", "ongoing", "long-term", "referral"]), "Repeat or ongoing work is visible.", {
          title: "Show repeat trust where possible",
          detail: "Repeat work signals reliability and client satisfaction.",
          action: "Mention retainers, repeat clients, referrals, long-term contracts, or recurring deliverables where true.",
          priority: "low"
        })
      ]
    }
  ],
  "career-changer": [
    {
      name: "Transferable positioning",
      description: "How well the CV connects past experience to a new target direction.",
      checks: [
        check("Transition summary", 25, ({ lowerText }) => hasAny(lowerText, ["summary", "objective", "transition", "career change", "career"]), "The CV frames the transition.", {
          title: "Frame the career change upfront",
          detail: "Career changers need to reduce confusion quickly.",
          action: "Use the summary to connect past experience, transferable strengths, and the target role.",
          priority: "high"
        }),
        check("Transferable skills", 25, ({ lowerText }) => hasAny(lowerText, ["communication", "analysis", "operations", "project", "customer", "training", "coordination", "leadership"]), "Transferable skills are visible.", {
          title: "Translate old experience into target-role value",
          detail: "Employers need help seeing how previous work applies to the new field.",
          action: "Emphasize transferable skills such as analysis, coordination, communication, customer work, leadership, or process improvement.",
          priority: "high"
        }),
        check("Relevant learning", 20, ({ lowerText }) => hasAny(lowerText, ["course", "certification", "training", "bootcamp", "project"]), "Relevant learning or projects are present.", {
          title: "Add proof of preparation",
          detail: "Courses and projects help show that the career change is intentional.",
          action: "Add relevant certifications, training, portfolio projects, volunteer work, or simulations.",
          priority: "high"
        }),
        check("Reduced unrelated detail", 15, ({ words }) => words.length <= 1150, "The CV is focused enough for a transition.", {
          title: "Reduce unrelated history",
          detail: "Too much old-field detail can distract from the target role.",
          action: "Keep older experience, but rewrite bullets around transferable outcomes rather than old-field tasks.",
          priority: "medium"
        }),
        check("Target role keywords", 15, ({ words, jobDescription }) => keywordOverlap(words, jobDescription) >= 0.18, "Target role language is present when a job description is supplied.", {
          title: "Use target-role language truthfully",
          detail: "Career-change CVs need language that maps old proof to new requirements.",
          action: "Use job-description keywords only where your actual experience, projects, or training support them.",
          priority: "medium"
        })
      ]
    }
  ]
};

export function scoreCv(context: RubricContext, parseWarnings: string[]): AnalysisResult {
  const categories = [...commonCategories, ...profileCategories[context.profileType]].map((category) => {
    const checks = category.checks.map((checkItem) => ({
      label: checkItem.label,
      passed: checkItem.passes(context),
      weight: checkItem.weight
    }));
    const earned = checks.reduce((sum, result) => sum + (result.passed ? result.weight : 0), 0);
    const total = checks.reduce((sum, result) => sum + result.weight, 0);
    const score = total > 0 ? Math.round((earned / total) * 100) : 100;
    const strengths = category.checks.filter((checkItem) => checkItem.passes(context)).map((checkItem) => checkItem.strength);
    const improvements = category.checks.filter((checkItem) => !checkItem.passes(context)).map((checkItem) => checkItem.feedback);

    return {
      name: category.name,
      score,
      summary: summarizeCategory(category.name, score, strengths, improvements),
      whatThisMeans: category.description,
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 4),
      checks
    };
  });

  const overallScore = Math.round(categories.reduce((sum, category) => sum + category.score, 0) / categories.length);
  const suggestions = collectSuggestions(categories.flatMap((category) => category.improvements)).slice(0, 8);
  const strengths = collectStrengths(categories.flatMap((category) => category.strengths)).slice(0, 6);

  return {
    reportId: crypto.randomUUID(),
    overallScore,
    profileType: context.profileType,
    profileLabel: profileLabels[context.profileType],
    summary: summarizeOverall(overallScore, context.profileType, suggestions),
    parseWarning: parseWarnings[0],
    categories,
    suggestions,
    strengths,
    generatedAt: new Date().toISOString()
  };
}

function check(
  label: string,
  weight: number,
  passes: (context: RubricContext) => boolean,
  strength: string,
  feedback: FeedbackItem
) {
  return { label, weight, passes, strength, feedback };
}

function collectSuggestions(items: FeedbackItem[]) {
  const seen = new Set<string>();
  return [...items]
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function collectStrengths(items: string[]) {
  return [...new Set(items)];
}

function priorityRank(priority: FeedbackItem["priority"]) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

function summarizeCategory(name: string, score: number, strengths: string[], improvements: FeedbackItem[]) {
  if (score >= 85) {
    const refinement = improvements[0]?.title ? ` The next useful refinement is: ${improvements[0].title}.` : "";
    return `${name} is strong. ${sentenceCase(cleanFragment(strengths[0]) ?? "solid evidence is already visible")}.${refinement}`;
  }
  if (score >= 70) {
    return `${name} is good but not finished. The next useful fix is: ${improvements[0]?.title ?? "strengthen the weaker checks"}.`;
  }
  if (score >= 50) {
    return `${name} has a foundation, but it needs clearer evidence and structure before important applications.`;
  }
  return `${name} is a priority area. Fix this before relying on the CV for serious applications.`;
}

function summarizeOverall(score: number, profileType: ProfileType, suggestions: FeedbackItem[]) {
  const label = profileLabels[profileType].toLowerCase();
  const leadingFix = suggestions[0]?.title;
  if (score >= 85) return `This is a strong ${label} CV. The next priority: ${leadingFix ?? "Tailor it to each role"} so it performs better in competitive shortlists.`;
  if (score >= 70) return `This ${label} CV is usable, but it is leaving value on the table. The most useful next fix is ${leadingFix ?? "sharpening evidence and role alignment"}.`;
  if (score >= 55) return `This ${label} CV has a workable base, but it needs visible improvements before important applications. Start with ${leadingFix ?? "structure, proof, and targeting"}.`;
  return `This ${label} CV needs a rebuild before it is likely to perform well. Start with ${leadingFix ?? "readability, missing sections, and concrete evidence"}.`;
}

function cleanFragment(value?: string) {
  if (!value) return undefined;
  return value.replace(/\.$/, "").replace(/^the cv\s+/i, "").toLowerCase();
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getMissingJobKeywords(context: RubricContext) {
  if (!context.jobDescription) return [];
  const cvWords = new Set(context.words);
  return extractJobKeywords(context.jobDescription).filter((word) => !cvWords.has(word)).slice(0, 12);
}
