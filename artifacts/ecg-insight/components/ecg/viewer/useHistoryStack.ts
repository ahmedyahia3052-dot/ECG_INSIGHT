import { useCallback, useRef, useState } from "react";

export function useHistoryStack<T>(initial: T, limit = 200) {
  const [present, setPresent] = useState(initial);
  const [historyMeta, setHistoryMeta] = useState({ future: 0, past: 0 });
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const syncMeta = useCallback(() => {
    setHistoryMeta({ future: futureRef.current.length, past: pastRef.current.length });
  }, []);

  const commit = useCallback(
    (next: T | ((current: T) => T)) => {
      setPresent((current) => {
        const resolved = typeof next === "function" ? (next as (value: T) => T)(current) : next;
        pastRef.current = [...pastRef.current.slice(-limit + 1), current];
        futureRef.current = [];
        syncMeta();
        return resolved;
      });
    },
    [limit, syncMeta],
  );

  const replace = useCallback(
    (next: T) => {
      setPresent(next);
      syncMeta();
    },
    [syncMeta],
  );

  const undo = useCallback(() => {
    setPresent((current) => {
      const past = pastRef.current;
      if (!past.length) return current;
      const previous = past[past.length - 1];
      pastRef.current = past.slice(0, -1);
      futureRef.current = [current, ...futureRef.current];
      syncMeta();
      return previous;
    });
  }, [syncMeta]);

  const redo = useCallback(() => {
    setPresent((current) => {
      const future = futureRef.current;
      if (!future.length) return current;
      const [next, ...rest] = future;
      futureRef.current = rest;
      pastRef.current = [...pastRef.current, current];
      syncMeta();
      return next;
    });
  }, [syncMeta]);

  const resetHistory = useCallback(
    (next: T) => {
      pastRef.current = [];
      futureRef.current = [];
      setPresent(next);
      syncMeta();
    },
    [syncMeta],
  );

  return {
    canRedo: historyMeta.future > 0,
    canUndo: historyMeta.past > 0,
    commit,
    present,
    redo,
    replace,
    resetHistory,
    undo,
  };
}
