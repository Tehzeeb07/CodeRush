/**
 * Web Development category detection.
 *
 * The canonical storage format is `category = "hackathon"` plus
 * `hackathonCategory = "web"` (or `category = "web"` directly). Challenges
 * created before the schema enforced these literals may store variants such
 * as "Web", "WEB", "webdev", "web-dev" or "web development" — these helpers
 * normalize them so the Open-in-Editor CTA, the editor route guard and the
 * challenge listing all treat them as Web Development challenges.
 */

export const HACKATHON_CATEGORY_VALUES = ["ai", "coding", "web"] as const;
export type HackathonCategoryValue = (typeof HACKATHON_CATEGORY_VALUES)[number];

/** Lowercase and strip everything that is not a-z (e.g. "Web-Development" → "webdevelopment"). */
export function normalizeCategoryToken(
  value: string | null | undefined
): string {
  return (value ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * True for any web-development-looking value:
 * "web", "Web", "WEB", "webdev", "web-dev", "web development", …
 */
export function isWebLikeCategory(value: string | null | undefined): boolean {
  const norm = normalizeCategoryToken(value);
  return norm.startsWith("web");
}

/** Map any (possibly legacy) hackathonCategory value to the canonical literal. */
export function normalizeHackathonCategory(
  value: string | null | undefined
): HackathonCategoryValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (isWebLikeCategory(value)) return "web";
  const norm = normalizeCategoryToken(value);
  if (norm === "ai") return "ai";
  if (norm === "coding") return "coding";
  return undefined;
}

/**
 * A challenge is a Web Development challenge when its category is `web`, or
 * it is a hackathon challenge with a web-like `hackathonCategory`.
 * Tolerant of legacy/non-canonical stored values.
 */
export function isWebDevChallenge(
  challenge:
    | { category?: string | null; hackathonCategory?: string | null }
    | null
    | undefined
): boolean {
  if (!challenge) return false;
  if (challenge.category === "web") return true;
  if (challenge.category === "hackathon") {
    return isWebLikeCategory(challenge.hackathonCategory);
  }
  return false;
}
