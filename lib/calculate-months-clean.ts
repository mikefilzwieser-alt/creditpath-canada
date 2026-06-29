export function calculateMonthsClean(programStartedAt: string | Date | null | undefined, now: Date = new Date()): number {
  if (!programStartedAt) return 0;
  const startedAt = programStartedAt instanceof Date ? programStartedAt : new Date(programStartedAt);
  if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(now.getTime())) return 0;
  return Math.max(
    0,
    (now.getFullYear() - startedAt.getFullYear()) * 12 + (now.getMonth() - startedAt.getMonth()),
  );
}
