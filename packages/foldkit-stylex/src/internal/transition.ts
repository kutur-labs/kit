/**
 * @foldkit/ui's transition states, spelled out for each module's `Reads`. `Supported` then fails
 * where the installed @foldkit/ui renamed or added one; `Animation.TransitionState` would follow
 * the rename, and `isClosed` would stay false in every state. A dropped state passes, as `isClosed`
 * stays right for the remaining ones.
 */
export type TransitionState =
  | "Idle"
  | "EnterStart"
  | "EnterAnimating"
  | "LeaveStart"
  | "LeaveAnimating";

const closedStates: ReadonlyArray<TransitionState> = ["EnterStart", "LeaveAnimating"];

const leavingStates: ReadonlyArray<TransitionState> = ["LeaveStart", "LeaveAnimating"];

/** Whether @foldkit/ui sets `data-closed` in this transition state. */
export const isClosed = (transitionState: TransitionState): boolean =>
  closedStates.includes(transitionState);

/**
 * `isVisible` and `isClosed` as @foldkit/ui derives `data-open` and `data-closed` from a model
 * whose RenderInfo carries no `isVisible`: visible while open and while leaving. Pass `isOpen`, or
 * Animation's `isShowing`.
 */
export const visibilityOf = (isOpen: boolean, transitionState: TransitionState) => ({
  isVisible: isOpen || leavingStates.includes(transitionState),
  isClosed: isClosed(transitionState),
});
