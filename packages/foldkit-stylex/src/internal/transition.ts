import type { Animation } from "@foldkit/ui";

// Typed against @foldkit/ui, so a renamed transition state fails this package's type check.
const closedStates: ReadonlyArray<Animation.TransitionState> = ["EnterStart", "LeaveAnimating"];

const leavingStates: ReadonlyArray<Animation.TransitionState> = ["LeaveStart", "LeaveAnimating"];

/** Whether @foldkit/ui sets `data-closed` in this transition state. */
export const isClosed = (transitionState: string): boolean =>
  closedStates.some((state) => state === transitionState);

/**
 * `isVisible` and `isClosed` as @foldkit/ui derives `data-open` and `data-closed` from a model
 * whose RenderInfo carries no `isVisible`: visible while open and while leaving. Pass `isOpen`, or
 * Animation's `isShowing`.
 */
export const visibilityOf = (isOpen: boolean, transitionState: string) => ({
  isVisible: isOpen || leavingStates.some((state) => state === transitionState),
  isClosed: isClosed(transitionState),
});
