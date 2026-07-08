import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useHistoryStack } from "@/components/ecg/viewer/useHistoryStack";

describe("useHistoryStack", () => {
  it("supports undo and redo for committed states", () => {
    const { result } = renderHook(() => useHistoryStack({ value: 0 }));

    act(() => result.current.commit({ value: 1 }));
    act(() => result.current.commit({ value: 2 }));

    expect(result.current.present).toEqual({ value: 2 });
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.present).toEqual({ value: 1 });
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.present).toEqual({ value: 2 });
  });

  it("clears future history on new commit after undo", () => {
    const { result } = renderHook(() => useHistoryStack("a"));
    act(() => result.current.commit("b"));
    act(() => result.current.undo());
    act(() => result.current.commit("c"));
    expect(result.current.present).toBe("c");
    expect(result.current.canRedo).toBe(false);
  });

  it("resetHistory clears undo/redo stacks", () => {
    const { result } = renderHook(() => useHistoryStack(1));
    act(() => result.current.commit(2));
    act(() => result.current.resetHistory(99));
    expect(result.current.present).toBe(99);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("skips commit when resolved primitive value is unchanged", () => {
    const { result } = renderHook(() => useHistoryStack(1));
    act(() => result.current.commit(1));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.present).toBe(1);
  });

  it("skips commit when resolved object reference is unchanged", () => {
    const initial = { n: 1 };
    const { result } = renderHook(() => useHistoryStack(initial));
    act(() => result.current.commit(initial));
    expect(result.current.canUndo).toBe(false);
  });
});
