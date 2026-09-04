// Fixed, hardcoded vocabulary (not an admin-configurable taxonomy table like
// Genre/FightSceneTag) — same convention as User.role and RATING_CATEGORIES:
// a small closed set with app-level validation, not something meant to grow
// member-by-member. Chosen over free text specifically so a future timeline
// page (see DECISIONS.md) can group/order movies by period without dealing
// with unbounded spelling variants of the same dynasty. Movie.eraSetting
// stores the `key` values below.
export const ERA_SETTINGS = [
  { key: "LEGENDARY", label: "Legendary / Mythological (before c. 2070 BC)" },
  { key: "WARRING_STATES", label: "Warring States (475–221 BC)" },
  { key: "QIN", label: "Qin Dynasty (221–206 BC)" },
  { key: "HAN", label: "Han Dynasty (206 BC–220 AD)" },
  { key: "THREE_KINGDOMS", label: "Three Kingdoms (220–280)" },
  { key: "JIN", label: "Jin Dynasty (266–420)" },
  { key: "TANG", label: "Tang Dynasty (618–907)" },
  { key: "SONG", label: "Song Dynasty (960–1279)" },
  { key: "YUAN", label: "Yuan Dynasty (1271–1368)" },
  { key: "MING", label: "Ming Dynasty (1368–1644)" },
  { key: "QING", label: "Qing Dynasty (1644–1912)" },
  { key: "REPUBLIC_ERA", label: "Republic of China (1912–1949)" },
  { key: "MODERN", label: "Modern Day / Contemporary (1949–present)" },
  { key: "OTHER", label: "Other / Unspecified" },
] as const;

export type EraSettingKey = (typeof ERA_SETTINGS)[number]["key"];

export function isEraSettingKey(value: unknown): value is EraSettingKey {
  return typeof value === "string" && ERA_SETTINGS.some((e) => e.key === value);
}

export function eraSettingLabel(key: string | null): string | null {
  return ERA_SETTINGS.find((e) => e.key === key)?.label ?? null;
}
