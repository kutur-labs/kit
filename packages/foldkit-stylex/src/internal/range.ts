// Meter's and Progress's numbers as @foldkit/ui writes them to `data-min`, `data-max` and
// `data-value` (@foldkit/ui `internal/range.ts`), so their state agrees with those attributes.

/** The bounds @foldkit/ui renders: `min` defaults to 0, and `max` to 100 and to no less than `min`. */
export const boundsOf = (config: Readonly<{ min?: number; max?: number }>) => {
  const min = config.min ?? 0;

  return { min, max: Math.max(min, config.max ?? 100) };
};

/** `value` held between the bounds, as @foldkit/ui renders it. */
export const clamp = (value: number, bounds: Readonly<{ min: number; max: number }>) =>
  Math.min(Math.max(value, bounds.min), bounds.max);
