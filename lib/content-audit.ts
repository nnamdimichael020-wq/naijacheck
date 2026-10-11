export type ContentAuditFinding = {
  route: string;
  category:
    | "outdated-year-headline"
    | "outdated-year-body"
    | "stale-verification-date"
    | "live-label-risk"
    | "official-watch-changed";
  severity: "info" | "review";
  detail: string;
  excerpt: string;
  recommendedAction: string;
};

export type ArticleAuditInput = {
  route: string;
  title?: string;
  h1?: string;
  bodyText?: string;
  section?: string;
  updatedAt?: string | null;
  currentYear?: number;
  nowMs?: number;
  maxManualAgeDays?: number;
};

const DEFAULT_CURRENT_YEAR = 2026;
const DEFAULT_MAX_MANUAL_AGE_DAYS = 45;

/**
 * Pure scanner for a single page/article record.
 * Never modifies content; returns advisory review findings only.
 */
export function scanArticleRecord({
  route,
  title = "",
  h1 = "",
  bodyText = "",
  section = "unknown",
  updatedAt = null,
  currentYear = DEFAULT_CURRENT_YEAR,
  nowMs = Date.now(),
  maxManualAgeDays = DEFAULT_MAX_MANUAL_AGE_DAYS,
}: ArticleAuditInput): ContentAuditFinding[] {
  const findings: ContentAuditFinding[] = [];
  const headlineText = `${title} | ${h1}`;

  const outdatedYearRe = new RegExp(`\\b(202[0-${Math.max(0, (currentYear % 10) - 1)}])\\b`, "g");
  const headlineYears = [...new Set([...headlineText.matchAll(outdatedYearRe)].map((m) => m[1]))];
  if (headlineYears.length > 0) {
    findings.push({
      route,
      category: "outdated-year-headline",
      severity: "review",
      detail: `Title or H1 references past year(s) ${headlineYears.join(", ")} (current utility year: ${currentYear}).`,
      excerpt: headlineText.slice(0, 180),
      recommendedAction: `Verify current ${currentYear} official policy/fees and update headline only after human verification.`,
    });
  }

  const bodyOutdatedFeeRe = new RegExp(
    `\\b(?:fee|cut-?off|registration|portal|tariff|schedule)\\b[^.?!]{0,45}\\b(202[0-${Math.max(0, (currentYear % 10) - 1)}])\\b`,
    "i",
  );
  const bodyYearMatch = bodyText.match(bodyOutdatedFeeRe);
  if (bodyYearMatch && headlineYears.length === 0) {
    findings.push({
      route,
      category: "outdated-year-body",
      severity: "review",
      detail: `Body text links a fee/cut-off/registration claim to past year ${bodyYearMatch[1]}.`,
      excerpt: bodyYearMatch[0].slice(0, 180),
      recommendedAction: `Check official agency portal for ${currentYear} updates before editing prose.`,
    });
  }

  if (updatedAt) {
    const updatedMs = Date.parse(updatedAt);
    if (!Number.isNaN(updatedMs)) {
      const ageDays = Math.floor((nowMs - updatedMs) / 86_400_000);
      if (ageDays > maxManualAgeDays) {
        findings.push({
          route,
          category: "stale-verification-date",
          severity: "review",
          detail: `Article updatedAt (${updatedAt}) is ${ageDays} days old (threshold: ${maxManualAgeDays} days).`,
          excerpt: `updatedAt: ${updatedAt}`,
          recommendedAction: "Re-verify figures against named official/market sources and update last-verified date via PR.",
        });
      }
    }
  }

  const isManualSection =
    section.startsWith("prices") ||
    section === "howto" ||
    section === "exam" ||
    section === "telecom" ||
    section === "cookbook" ||
    section.startsWith("hustle");
  if (isManualSection) {
    const sentences = bodyText.split(/(?<=[.?!])\s+/);
    for (const sentence of sentences) {
      if (/\blive (?:market |pump |city |food |telecom |official )?(?:price|prices|rate|rates|fee|fees)\b/i.test(sentence)) {
        const isNegated = /\b(?:not|never|no|instead of|rather than|distinguish|separate from|unlike)\b/i.test(sentence);
        if (!isNegated) {
          findings.push({
            route,
            category: "live-label-risk",
            severity: "review",
            detail: `Manual/seeded section (${section}) contains an unnegated "live price/rate/fee" phrase.`,
            excerpt: sentence.slice(0, 180),
            recommendedAction: "Ensure seeded/manual/survey figures are labelled dated or indicative, never live.",
          });
          break;
        }
      }
    }
  }

  return findings;
}

export function scanOfficialWatchState(watchJson: {
  pages?: Record<
    string,
    {
      label?: string;
      url?: string;
      changedSincePrevious?: boolean;
      reviewRequired?: boolean;
      reviewReason?: string | null;
    }
  >;
}): ContentAuditFinding[] {
  const findings: ContentAuditFinding[] = [];
  const pages = watchJson?.pages ?? {};
  for (const [id, entry] of Object.entries(pages)) {
    if (entry?.changedSincePrevious || entry?.reviewRequired) {
      findings.push({
        route: `/status#watch-${id}`,
        category: "official-watch-changed",
        severity: "review",
        detail: `Official page fingerprint changed for ${entry.label || id} (${entry.url}).`,
        excerpt: entry.reviewReason || "Official public page wording changed since previous check.",
        recommendedAction: `Inspect ${entry.url} manually and verify whether any GovHowTo or Exam fee/rule needs a PR update.`,
      });
    }
  }
  return findings;
}
