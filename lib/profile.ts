/**
 * Canonical profile fields shown first, in fixed order.
 * English display label mapped to the underlying Redis key (the bot writes French keys).
 * "Preferred name" reuses the existing "nom" key (what the user goes by, e.g. "Weasel"),
 * like Claude asking "what should I call you". First/last names are dedicated keys.
 */
// labelKey is an i18n key in the "memory" namespace (translated client-side).
export const CANONICAL_FIELDS: { key: string; labelKey: string }[] = [
  { key: "fullName", labelKey: "fieldFullName" },
  { key: "nom", labelKey: "fieldNickname" },
  { key: "âge", labelKey: "fieldAge" },
  { key: "ville", labelKey: "fieldLocation" },
  { key: "profession", labelKey: "fieldProfession" },
  { key: "origine", labelKey: "fieldOrigin" },
];

const CANONICAL_KEYS = new Set<string>(CANONICAL_FIELDS.map((f) => f.key));

export interface SplitProfile {
  canonical: { field: string; labelKey: string; value: string }[];
  custom: { field: string; value: string }[];
  name: string;
  agency: string;
  city: string;
}

export function splitProfile(profile: Record<string, string>): SplitProfile {
  const canonical = CANONICAL_FIELDS.map((f) => ({
    field: f.key,
    labelKey: f.labelKey,
    value: profile[f.key] ?? "",
  }));
  const custom = Object.entries(profile)
    .filter(([k]) => !CANONICAL_KEYS.has(k))
    .map(([field, value]) => ({ field, value }));

  // display name = nickname, else full name, else legacy first/last
  const first = profile["firstName"] ?? "";
  const last = profile["lastName"] ?? "";
  const name =
    profile["nom"] ||
    profile["fullName"] ||
    [first, last].filter(Boolean).join(" ") ||
    first ||
    "";

  return {
    canonical,
    custom,
    name,
    agency: profile["agence"] ?? profile["activité"] ?? profile["activite"] ?? "",
    city: profile["ville"] ?? "",
  };
}

export function isCanonical(field: string): boolean {
  return CANONICAL_KEYS.has(field);
}
