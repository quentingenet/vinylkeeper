import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLikeButton } from "@hooks/useLikeButton";

vi.mock("@hooks/useCollectionLike", () => ({
  useCollectionLike: () => ({
    like: vi.fn(),
    unlike: vi.fn(),
    isLiking: false,
    isUnliking: false,
    likeError: null,
    unlikeError: null,
  }),
}));

function clickEvent() {
  return { stopPropagation: vi.fn() } as unknown as React.MouseEvent;
}

describe("useLikeButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets a cooldown after a click and clears it after 1s", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useLikeButton({ collectionId: 1, initialIsLiked: false, initialLikesCount: 0 })
    );

    act(() => result.current.handleLikeClick(clickEvent()));
    expect(result.current.likeCooldown).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.likeCooldown).toBe(false);
  });

  it("clears the pending cooldown timeout on unmount", () => {
    // Regression test: handleLikeClick's setTimeout was never stored/cleared.
    // The hook also runs an unrelated bounce-animation timeout on every
    // count change, so we must match the exact timeout id returned for the
    // cooldown timer rather than just asserting clearTimeout was called.
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useLikeButton({ collectionId: 1, initialIsLiked: false, initialLikesCount: 0 })
    );

    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    act(() => result.current.handleLikeClick(clickEvent()));
    // handleLikeClick schedules the cooldown timeout before triggering any
    // state update, so it is always the first setTimeout call in this act().
    const cooldownTimeoutId = setTimeoutSpy.mock.results[0]
      .value as ReturnType<typeof setTimeout>;

    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(cooldownTimeoutId);
  });
});
