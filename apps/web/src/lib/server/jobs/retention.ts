export type RetentionJobDeps = {
  now: Date;
  /** Months to keep contact submissions (default 24). */
  months?: number;
  deleteOlderThan: (cutoffIso: string) => Promise<number>;
};

export type RetentionJobResult = { cutoff: string; deleted: number };

/** Delete contact formSubmission docs older than `months` (default 24). */
export async function runRetentionJob(deps: RetentionJobDeps): Promise<RetentionJobResult> {
  const months = deps.months ?? 24;
  const cutoff = new Date(deps.now.getTime());
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  const cutoffIso = cutoff.toISOString();
  const deleted = await deps.deleteOlderThan(cutoffIso);
  return { cutoff: cutoffIso, deleted };
}
