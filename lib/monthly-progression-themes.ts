/** Themed program months (1–4). Month 5+ is “Coming Soon” in the UI. */
export const MAX_THEMED_PROGRAM_MONTH = 4;

const TITLES: Record<number, string> = {
  1: "Building Your Foundation",
  2: "Reducing What's Hurting You",
  3: "Collections Strategy",
  4: "Strengthening Your Credit Mix",
};

const SUBTITLES: Record<number, string> = {
  1: "Protect your score, set up systems, fill credit gaps",
  2: "Target utilization and missed payments",
  3: "What to pay, what to let age off",
  4: "Optimize tradeline variety",
};

export function getProgramMonthThemeTitle(month: number): string {
  if (month >= 5) return "Coming Soon";
  return TITLES[month] ?? TITLES[1]!;
}

export function getProgramMonthThemeSubtitle(month: number): string {
  if (month >= 5) return "New content unlocks as your program progresses";
  return SUBTITLES[month] ?? SUBTITLES[1]!;
}

export function normalizeProgramMonth(raw: number | null | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(raw));
}
