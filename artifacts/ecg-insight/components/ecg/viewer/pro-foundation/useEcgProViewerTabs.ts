import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

export function useEcgProViewerTabs(input: { activeCaseId?: string; tabsParam?: string }) {
  const router = useRouter();

  const tabIds = useMemo(() => {
    const parsed = (input.tabsParam ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (!input.activeCaseId) return parsed;
    if (!parsed.length) return [input.activeCaseId];
    if (parsed.includes(input.activeCaseId)) return parsed;
    return [input.activeCaseId, ...parsed];
  }, [input.activeCaseId, input.tabsParam]);

  const selectCase = useCallback(
    (nextCaseId: string) => {
      const nextTabs = tabIds.includes(nextCaseId) ? tabIds : [...tabIds, nextCaseId];
      router.setParams({ caseId: nextCaseId, tabs: nextTabs.join(",") });
    },
    [router, tabIds],
  );

  return { selectCase, tabIds };
}
