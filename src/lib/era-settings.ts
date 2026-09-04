// Fixed, hardcoded vocabulary (not an admin-configurable taxonomy table like
// Genre/FightSceneTag) — same convention as User.role and RATING_CATEGORIES:
// a small closed set with app-level validation, not something meant to grow
// member-by-member. Chosen over free text specifically so a future timeline
// page (see DECISIONS.md) can group/order movies by period without dealing
// with unbounded spelling variants of the same dynasty. Movie.eraSetting
// stores the `key` values below.
export const ERA_SETTINGS = [
  { key: "LEGENDARY", label: "Legendary / Mythological" },
  { key: "WARRING_STATES", label: "Warring States" },
  { key: "QIN", label: "Qin Dynasty" },
  { key: "HAN", label: "Han Dynasty" },
  { key: "THREE_KINGDOMS", label: "Three Kingdoms" },
  { key: "JIN", label: "Jin Dynasty" },
  { key: "TANG", label: "Tang Dynasty" },
  { key: "SONG", label: "Song Dynasty" },
  { key: "YUAN", label: "Yuan Dynasty" },
  { key: "MING", label: "Ming Dynasty" },
  { key: "QING", label: "Qing Dynasty" },
  { key: "REPUBLIC_ERA", label: "Republic of China (1912–1949)" },
  { key: "MODERN", label: "Modern Day / Contemporary" },
  { key: "OTHER", label: "Other / Unspecified" },
] as const;

export type EraSettingKey = (typeof ERA_SETTINGS)[number]["key"];

export function isEraSettingKey(value: unknown): value is EraSettingKey {
  return typeof value === "string" && ERA_SETTINGS.some((e) => e.key === value);
}

export function eraSettingLabel(key: string | null): string | null {
  return ERA_SETTINGS.find((e) => e.key === key)?.label ?? null;
}
