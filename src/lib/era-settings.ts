// Fixed, hardcoded vocabulary (not an admin-configurable taxonomy table like
// Genre/FightSceneTag) — same convention as User.role and RATING_CATEGORIES:
// a small closed set with app-level validation, not something meant to grow
// member-by-member. Chosen over free text specifically so a future timeline
// page (see DECISIONS.md) can group/order movies by period without dealing
// with unbounded spelling variants of the same dynasty. Movie.eraSetting
// stores the `key` values below.
//
// `name` and `years` are kept separate (rather than one baked-in string) so
// the main display line can show just the name -- "Historical Setting: Han
// Dynasty" -- instead of the full "Name (years)" form, which reliably wraps
// to 2-3 lines in the control's narrow column for the longer entries. The
// full form (via eraSettingLabel) is still used where the date range is the
// point: the dropdown options and edit-history entries.
const ERA_SETTINGS_BASE = [
  { key: "LEGENDARY", name: "Legendary / Mythological", years: "before c. 2070 BC" },
  { key: "WARRING_STATES", name: "Warring States", years: "475–221 BC" },
  { key: "QIN", name: "Qin Dynasty", years: "221–206 BC" },
  { key: "HAN", name: "Han Dynasty", years: "206 BC–220 AD" },
  { key: "THREE_KINGDOMS", name: "Three Kingdoms", years: "220–280" },
  { key: "JIN", name: "Jin Dynasty", years: "266–420" },
  { key: "TANG", name: "Tang Dynasty", years: "618–907" },
  { key: "SONG", name: "Song Dynasty", years: "960–1279" },
  { key: "YUAN", name: "Yuan Dynasty", years: "1271–1368" },
  { key: "MING", name: "Ming Dynasty", years: "1368–1644" },
  { key: "QING", name: "Qing Dynasty", years: "1644–1912" },
  { key: "REPUBLIC_ERA", name: "Republic of China", years: "1912–1949" },
  { key: "MODERN", name: "Modern Day / Contemporary", years: "1949–present" },
  { key: "OTHER", name: "Other / Unspecified", years: null },
] as const;

export const ERA_SETTINGS = ERA_SETTINGS_BASE.map((e) => ({
  ...e,
  label: e.years ? `${e.name} (${e.years})` : e.name,
}));

export type EraSettingKey = (typeof ERA_SETTINGS_BASE)[number]["key"];

export function isEraSettingKey(value: unknown): value is EraSettingKey {
  return typeof value === "string" && ERA_SETTINGS.some((e) => e.key === value);
}

// Full "Name (years)" form — dropdown options and edit-history entries,
// where the year range is exactly the information being looked up.
export function eraSettingLabel(key: string | null): string | null {
  return ERA_SETTINGS.find((e) => e.key === key)?.label ?? null;
}

// Short form — the control's own compact display line.
export function eraSettingName(key: string | null): string | null {
  return ERA_SETTINGS.find((e) => e.key === key)?.name ?? null;
}

// Just the year range, shown as a muted secondary line under the name
// rather than inline after it — inline "Name (years)" is what wrapped
// awkwardly in the first place.
export function eraSettingYears(key: string | null): string | null {
  return ERA_SETTINGS.find((e) => e.key === key)?.years ?? null;
}
