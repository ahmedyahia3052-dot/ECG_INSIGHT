import { useEffect, useRef } from "react";

export function useAutoDigitizeCase(input: {
  caseHasImage: boolean;
  caseId?: string;
  digitalEcgAvailable: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isPending: boolean;
  mutate: () => void;
  token?: string;
}) {
  const triggeredRef = useRef(false);

  useEffect(() => {
    triggeredRef.current = false;
  }, [input.caseId]);

  useEffect(() => {
    if (!input.token || !input.caseId || !input.caseHasImage) return;
    if (triggeredRef.current || input.isPending) return;
    if (input.isLoading || input.isFetching) return;
    if (input.digitalEcgAvailable) return;
    triggeredRef.current = true;
    input.mutate();
  }, [
    input.caseHasImage,
    input.caseId,
    input.digitalEcgAvailable,
    input.isFetching,
    input.isLoading,
    input.isPending,
    input.mutate,
    input.token,
  ]);
}
