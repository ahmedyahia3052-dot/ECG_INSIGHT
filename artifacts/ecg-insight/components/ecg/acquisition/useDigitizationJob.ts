import { useCallback, useEffect, useRef, useState } from "react";

import { cancelDigitizationJob, getDigitizationJob, startDigitizationJob, type DigitizationJobRecord } from "@/services/ecgProcessing";

export function useDigitizationJob(accessToken?: string, caseId?: string) {
  const [job, setJob] = useState<DigitizationJobRecord | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (jobId: string) => {
      if (!accessToken) return;
      const next = await getDigitizationJob(accessToken, jobId);
      setJob(next.job);
      if (next.job.stage === "complete" || next.job.stage === "failed" || next.job.stage === "cancelled") {
        clearTimer();
      }
    },
    [accessToken, clearTimer],
  );

  const start = useCallback(
    async (override?: { gainMmPerMv?: 5 | 10 | 20; paperSpeedMmPerSec?: 25 | 50 }) => {
      if (!accessToken || !caseId) return null;
      clearTimer();
      const created = await startDigitizationJob(accessToken, { caseId, ...override });
      setJob(created.job);
      timerRef.current = setInterval(() => {
        void poll(created.job.id);
      }, 900);
      return created.job;
    },
    [accessToken, caseId, clearTimer, poll],
  );

  const cancel = useCallback(async () => {
    if (!accessToken || !job?.id) return;
    await cancelDigitizationJob(accessToken, job.id);
    await poll(job.id);
  }, [accessToken, job?.id, poll]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { cancel, job, progress: job?.progress ?? 0, stage: job?.stage ?? "queued", start };
}
