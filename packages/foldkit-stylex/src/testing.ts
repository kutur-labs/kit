// Accessibility checks that need a browser's layout, focus and animations, which happy-dom computes
// none of and axe-core leaves out. axe keeps text contrast, names, roles and ARIA.
//
// Vitest browser mode calls `audit` and `recordMotion` directly; Playwright sends them to the page
// as source, through `page.evaluate` or `page.addInitScript`. Each therefore reaches nothing
// outside its own body: no import, no module constant, no helper of this module. The two share
// the motion log through a cancelable event on `window`, which also tells `audit` whether the
// recorder runs.

/** A rule `audit` checks. */
export type AuditRule =
  | "edge"
  | "focus"
  | "target"
  | "reflow"
  | "clipped"
  | "motion"
  | "state"
  | "unmeasured";

/** What a check found, as plain data a test compares with `[]`. */
export type Finding<Rule extends string = AuditRule> = Readonly<{
  rule: Rule;
  /** The element, such as `button#save "Save"`. */
  at: string;
  /** What was measured, what is required and why, and what to change. */
  message: string;
}>;

export type AuditOptions = Readonly<{
  /**
   * Selector of the elements to check, plus the panels they name in `aria-controls` or
   * `aria-owns`, which @foldkit/ui portals out of them. Default `body`.
   */
  root?: string;
  /** Subtrees no rule checks, such as a payment frame. They still cover what lies under them. */
  exclude?: string;
  /**
   * `"AA"` checks WCAG 2.2 AA, which passes a target under 24px spaced from others (2.5.8).
   * `"kit"` (default) asks more: 24px targets without that exception and 44px under a coarse
   * pointer, 2px focus outlines, a finding for a focus change it cannot measure and no movement
   * under reduced motion (WCAG 2.5.8, 2.5.5, 2.4.13 and 2.3.3).
   */
  level?: "kit" | "AA";
  /**
   * Selector of text fields that rest at a faint edge on a fill of their own and turn their edge to
   * 3:1 on hover, with a focus outline on focus, or that take no input, such as a read-only well
   * marked by its fill alone. Outside forced colors, the `edge` rule then asks such a field only
   * for a fill of at least 1.05:1 against what is behind it: the fill marks the field at rest. It
   * cannot hover, so check the hover edge's contrast where the color is set. Default: none, so
   * every field needs a 3:1 edge.
   */
  hairline?: string;
}>;

/** A browser context to run every audit in: one value per axis, as Playwright's `use` takes it. */
export type Variation = Readonly<{
  name: string;
  colorScheme: "light" | "dark";
  reducedMotion: "no-preference" | "reduce";
  forcedColors: "none" | "active";
  /** A touch screen, which also makes the pointer coarse and drops hover. */
  hasTouch: boolean;
  viewport: Readonly<{ width: number; height: number }>;
}>;

// A transition or animation that recordMotion logged, with its values when it started: by the
// time audit runs, it has ended and getAnimations() no longer lists it. `path` is the event's
// composed path then, so audit can scope an element that has since left the page.
type Motion = Readonly<{
  path: ReadonlyArray<EventTarget>;
  pseudo: string;
  property: string;
  from: string;
  to: string;
  duration: number;
}>;

/**
 * Logs the CSS transitions and animations that start from now on and last longer than a frame,
 * which `audit` reads for its `motion` rule; `element.animate()` and smooth scrolling go unlogged.
 * Call it before the app renders: at the top of a Vitest browser test file, or through
 * `page.addInitScript(recordMotion)` in Playwright, which runs it again after each navigation.
 * `page.setContent` drops it, so call it again after that. A second call does nothing.
 */
export const recordMotion = (): void => {
  const channel = "kutur-kit:motion";

  // A recorder that already runs cancels the event; a null detail leaves its log in place.
  if (!window.dispatchEvent(new CustomEvent(channel, { cancelable: true, detail: null }))) return;

  const log: Array<Motion> = [];

  const isTiming = (key: string) =>
    ["offset", "easing", "composite", "computedOffset"].includes(key);

  const kebab = (key: string) => key.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

  // One entry per property an animation's keyframes change; a keyframe that leaves a property out
  // takes the element's own value there. A transition always changes its property, since equal
  // values start none, even where its keyframes read the same: Chromium writes a
  // grid-template-rows of 0fr and of 1fr both as the 0px it starts at.
  const changes = (effect: KeyframeEffect, isTransition: boolean) => {
    const keyframes = effect.getKeyframes();
    const keys = [...new Set(keyframes.flatMap((keyframe) => Object.keys(keyframe)))];

    return keys
      .filter((key) => !isTiming(key))
      .flatMap((key) => {
        const values = keyframes.map((keyframe) =>
          keyframe[key] === undefined ? "its own value" : String(keyframe[key]),
        );

        return isTransition || new Set(values).size > 1
          ? [{ property: kebab(key), from: values[0] ?? "", to: values.at(-1) ?? "" }]
          : [];
      });
  };

  // A frame or less shows no movement, which is what the common reduced-motion reset of 0.01ms
  // durations relies on.
  const frame = 16;

  const isRunning = (
    animation: Animation,
    target: Element,
    pseudo: string,
    name: string,
  ): animation is CSSTransition | CSSAnimation =>
    animation.effect instanceof KeyframeEffect &&
    animation.effect.target === target &&
    (animation.effect.pseudoElement ?? "") === pseudo &&
    (animation instanceof CSSTransition
      ? animation.transitionProperty === name
      : animation instanceof CSSAnimation && animation.animationName === name);

  const record = (event: TransitionEvent | AnimationEvent) => {
    const { target } = event;

    if (!(target instanceof Element)) return;
    const pseudo = event.pseudoElement;
    const name = event instanceof TransitionEvent ? event.propertyName : event.animationName;
    const path = event.composedPath();

    // Events arrive a frame after their animation starts. One no longer listed by then has ended,
    // or left the page with its element, unseen.
    const effect = target
      .getAnimations({ subtree: true })
      .find((animation) => isRunning(animation, target, pseudo, name))?.effect;

    if (!(effect instanceof KeyframeEffect)) return;
    const duration = Number(effect.getComputedTiming().duration);

    if (duration <= frame) return;

    log.push(
      ...changes(effect, event instanceof TransitionEvent).map((change) => ({
        path,
        pseudo,
        duration,
        ...change,
      })),
    );
  };

  window.addEventListener("transitionrun", record, true);
  window.addEventListener("animationstart", record, true);

  // audit sends an array, and the recorder adds its log, from which audit takes the records in its
  // scope. Records outside it stay for an audit of their own.
  window.addEventListener(channel, (event) => {
    event.preventDefault();

    if (event instanceof CustomEvent && Array.isArray(event.detail)) event.detail.push(log);
  });
};

/**
 * Checks the page in its current state for what axe-core cannot see: control edges, keyboard
 * focus, pointer targets, reflow, clipped text, movement under reduced motion and state under forced
 * colors. It first waits for animations to settle, then measures in one task, so the app sees no
 * focus event, and restores focus and scroll. Throws when `root` matches nothing, when something
 * still animates after 5s, or under reduced motion at `kit` without `recordMotion`.
 */
export const audit = async ({
  root = "body",
  exclude,
  level = "kit",
  hairline,
}: AuditOptions = {}): Promise<ReadonlyArray<Finding>> => {
  type Rgba = readonly [number, number, number, number];

  type Box = Readonly<{ left: number; top: number; right: number; bottom: number }>;

  const isKit = level === "kit";
  const roots = Array.from(document.querySelectorAll(root));

  if (roots.length === 0) {
    throw new Error(
      `No element matches the root "${root}". Pass the selector of an element on the page, or leave root out to check the whole body.`,
    );
  }

  // Scope.
  const isExcluded = (element: Element) =>
    exclude !== undefined && element.closest(exclude) !== null;

  // The panels an element's controls name, which @foldkit/ui may portal elsewhere in the page.
  const named = (element: Element) =>
    ["aria-controls", "aria-owns"]
      .flatMap((attribute) => (element.getAttribute(attribute) ?? "").split(/\s+/))
      .flatMap((id) => {
        const panel = id === "" ? null : document.getElementById(id);

        return panel === null ? [] : [panel];
      });

  const withPanels = (
    found: ReadonlySet<Element>,
    added: ReadonlyArray<Element>,
  ): ReadonlySet<Element> => {
    const panels = added
      .flatMap((element) => [element, ...element.querySelectorAll("[aria-controls], [aria-owns]")])
      .flatMap(named)
      .filter((panel) => !found.has(panel));

    return panels.length === 0 ? found : withPanels(new Set([...found, ...panels]), panels);
  };

  const regions = [...withPanels(new Set(roots), roots)];

  const isInScope = (element: Element) =>
    regions.some((region) => region.contains(element)) && !isExcluded(element);

  const describe = (element: Element) => {
    const role = element.getAttribute("role");
    const tag = element.tagName.toLowerCase();
    const id = element.id === "" ? "" : `#${element.id}`;
    const key = id === "" && role !== null ? `[role=${role}]` : id;
    const text = element instanceof HTMLElement ? element.innerText : element.textContent;

    const name = (element.getAttribute("aria-label") ?? text ?? "")
      .replaceAll(/\s+/g, " ")
      .trim()
      .slice(0, 40);

    return `${tag}${key}${name === "" ? "" : ` "${name}"`}`;
  };

  const style = (element: Element, pseudo?: string) => getComputedStyle(element, pseudo);

  const ancestry = (element: Element): ReadonlyArray<Element> =>
    element.parentElement === null ? [element] : [element, ...ancestry(element.parentElement)];

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  // Settling: @foldkit/ui marks a panel with data-transition while it enters or leaves, and the
  // theme may still fade it after that. Infinite animations, such as a spinner, never settle.
  const isSettling = (animation: Animation) => {
    const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;

    return (
      (animation.playState === "running" || animation.pending) &&
      Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)) &&
      (target === null || !isExcluded(target))
    );
  };

  const busy = () => {
    const animation = document.getAnimations().find(isSettling);

    if (animation !== undefined) {
      const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;

      return { element: target ?? document.documentElement, reason: "was still animating" };
    }

    const marked = [...document.querySelectorAll("[data-transition]")].find(
      (element) => !isExcluded(element),
    );

    return marked === undefined
      ? undefined
      : { element: marked, reason: "still carried data-transition" };
  };

  const deadline = performance.now() + 5000;

  const settle = async (): Promise<void> => {
    const pending = busy();

    if (pending === undefined) return;

    if (performance.now() > deadline) {
      throw new Error(
        `${describe(pending.element)} ${pending.reason} after 5s, so audit cannot measure the page at rest. Let finite animations and @foldkit/ui transitions end, or exclude the element.`,
      );
    }

    await nextFrame();

    return settle();
  };

  await settle();

  const isScoped = (path: ReadonlyArray<EventTarget>) =>
    path.some((target) => target instanceof Element && regions.includes(target)) &&
    !path.some(
      (target) => target instanceof Element && exclude !== undefined && target.matches(exclude),
    );

  const logs: Array<Array<Motion>> = [];

  const isRecording = !window.dispatchEvent(
    new CustomEvent("kutur-kit:motion", { cancelable: true, detail: logs }),
  );

  // What moved in scope since the last audit of it.
  const moved = logs.flatMap((log) => {
    const taken = log.filter(({ path }) => isScoped(path));
    log.splice(0, log.length, ...log.filter((motion) => !taken.includes(motion)));

    return taken;
  });

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (isKit && reducedMotion && !isRecording) {
    throw new Error(
      "Call recordMotion before the app renders. page.setContent and navigations drop it: in Playwright, page.addInitScript(recordMotion) runs it again on every navigation, and page.evaluate(recordMotion) after page.setContent. Without it, audit cannot tell what moved under reduced motion.",
    );
  }

  // Colors, read through a canvas, which parses every syntax a computed style may hold.
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (context === null) {
    throw new Error("audit reads colors through a 2D canvas, which this page cannot create.");
  }

  const rgba = (color: string): Rgba => {
    context.clearRect(0, 0, 1, 1);
    // A color the canvas cannot parse leaves the previous fill in place.
    context.fillStyle = "transparent";
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;

    return [r, g, b, a / 255];
  };

  const hex = ([r, g, b]: Rgba) =>
    `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;

  const over = (top: Rgba, bottom: Rgba): Rgba => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);

    const channel = (index: 0 | 1 | 2) =>
      alpha === 0 ? 0 : (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha;

    return [channel(0), channel(1), channel(2), alpha];
  };

  // The canvas color in the scheme in use, which the page shows where nothing sets a background.
  const canvasColor = () => {
    const probe = document.body.appendChild(document.createElement("div"));
    probe.style.backgroundColor = "Canvas";
    const color = rgba(style(probe).backgroundColor);
    probe.remove();

    return color;
  };

  const pageCanvas = canvasColor();

  // The color an element's own and its ancestors' backgrounds show behind it, down to the first
  // opaque one, or the element whose background image or gradient makes it unknown. Positioned
  // boxes painted under it, such as a sibling's, are not seen.
  const behind = (element: Element): Rgba | Element => {
    const layers: Array<Rgba> = [];

    for (const current of ancestry(element)) {
      const { backgroundColor, backgroundImage } = style(current);

      if (backgroundImage !== "none") return current;
      const layer = rgba(backgroundColor);
      layers.push(layer);

      if (layer[3] === 1) break;
    }

    return layers.reduceRight((below, layer) => over(layer, below), pageCanvas);
  };

  // The nearest ancestor whose box holds all of an element's. A control that overflows its parent,
  // such as a round slider thumb on a thin track, shows mostly what lies behind that parent.
  const holderOf = (element: Element): Element => {
    const box = element.getBoundingClientRect();

    const holds = (ancestor: Element) => {
      const held = ancestor.getBoundingClientRect();

      return (
        held.left <= box.left &&
        held.top <= box.top &&
        held.right >= box.right &&
        held.bottom >= box.bottom
      );
    };

    return ancestry(element).slice(1).find(holds) ?? document.documentElement;
  };

  const luminance = ([r, g, b]: Rgba) => {
    const linear = (channel: number) =>
      channel / 255 <= 0.04045 ? channel / 255 / 12.92 : ((channel / 255 + 0.055) / 1.055) ** 2.4;

    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };

  const ratio = (first: Rgba, second: Rgba) => {
    const [a, b] = [luminance(first), luminance(second)];

    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  // Rounded down, so a ratio just under its bar never reads as the bar.
  const shown = (value: number) => `${Math.floor(value * 100) / 100}:1`;

  // What WCAG checks: visible, enabled elements in scope.
  const isLive = (element: Element) =>
    element.checkVisibility({ opacityProperty: true, visibilityProperty: true }) &&
    element.closest('[disabled], [aria-disabled="true"], [data-disabled]') === null;

  const elements = [
    ...new Set(regions.flatMap((region) => [region, ...region.querySelectorAll("*")])),
  ].filter((element) => !isExcluded(element) && isLive(element));

  // A visually hidden input, such as a file drop's, is the label people see.
  const seen = (element: Element) => {
    const { width, height } = element.getBoundingClientRect();
    const label = element instanceof HTMLInputElement ? element.labels?.[0] : undefined;

    return width <= 1 && height <= 1 && label !== undefined ? label : element;
  };

  const reaches = (element: Element, hit: Element | null) =>
    hit !== null &&
    (element.contains(hit) ||
      seen(element).contains(hit) ||
      hit.closest("label")?.control === element);

  const findings: Array<Finding> = [];

  const report = (rule: AuditRule, element: Element, message: string) => {
    const at = describe(element);
    findings.push({ rule, at, message: `${at} ${message}` });
  };

  // Its own rule, so a test that filters by rule keeps it: audit has measured nothing.
  const reportUnmeasured = (element: Element, what: string, image: Element) =>
    report(
      "unmeasured",
      element,
      `cannot be measured: its ${what} lies over the background image or gradient of ${describe(image)}, so audit cannot measure the backdrop (WCAG 1.4.11). Check that the ${what} reaches 3:1 against every part of the image, then exclude the element or drop this finding.`,
    );

  // motion, WCAG 2.3.3 at kit: what moved since the last audit, under reduced motion.
  const isMovement = (property: string) =>
    !["opacity", "visibility", "display", "overlay", "fill", "stroke"].includes(property) &&
    !/(^|-)color$/.test(property);

  const checkMotion = () => {
    const reported = new Set<string>();

    for (const { path, pseudo, property, from, to, duration } of moved) {
      const [target] = path;
      const at = target instanceof Element ? `${describe(target)}${pseudo}` : "";

      if (at === "" || !isMovement(property) || reported.has(`${at} ${property}`)) continue;
      // A transition's keyframes may read the same at both ends; see recordMotion.
      const values = from === to ? "" : ` ${from} → ${to}`;
      reported.add(`${at} ${property}`);
      findings.push({
        rule: "motion",
        at,
        message: `${at} moved (${property}${values}, ${duration}ms) under prefers-reduced-motion: reduce, which can make people sick (WCAG 2.3.3). Hold the value or use 0s under that query; opacity fades may stay.`,
      });
    }
  };

  // paint: what a box draws as people see it. A box hidden, faded or flattened keeps its computed
  // colors and outlines, so the rules read them through how much of the box shows.

  // An element's box and the pseudo-elements that may draw its focus ring instead.
  const pseudos = [undefined, "::before", "::after"] as const;

  type Pseudo = (typeof pseudos)[number];

  // A transform or scale of 0 along either axis leaves a box no area to paint.
  const isFlat = ({ transform, scale }: CSSStyleDeclaration) => {
    const { a, b, c, d } = new DOMMatrixReadOnly(transform === "none" ? undefined : transform);

    return a * d - b * c === 0 || scale.split(" ").slice(0, 2).map(Number.parseFloat).includes(0);
  };

  // How much of a box's paint shows, from 0 to 1: its opacity and its ancestors', multiplied, or 0
  // where it is not rendered, is hidden or is flattened. An SVG shape's screen matrix holds its
  // transform attribute and viewBox too. A pseudo-element without content has no box, and may be
  // visible in a hidden element.
  const alphaOf = (element: Element, pseudo?: Pseudo) => {
    const own = pseudo === undefined ? [] : [style(element, pseudo)];
    const matrix = element instanceof SVGGraphicsElement ? element.getScreenCTM() : undefined;

    const isHidden =
      own.some(
        (computed) =>
          ["none", "normal"].includes(computed.content) ||
          computed.display === "none" ||
          computed.visibility !== "visible" ||
          isFlat(computed),
      ) ||
      !element.checkVisibility({ visibilityProperty: pseudo === undefined }) ||
      (matrix === undefined
        ? ancestry(element).some((current) => isFlat(style(current)))
        : matrix === null || matrix.a * matrix.d - matrix.b * matrix.c === 0);

    return isHidden
      ? 0
      : [...own, ...ancestry(element).map((current) => style(current))].reduce(
          (alpha, { opacity }) => alpha * Number.parseFloat(opacity),
          1,
        );
  };

  const faded = ([r, g, b, a]: Rgba, alpha: number): Rgba => [r, g, b, a * alpha];

  // Whether a dash of a stroke's pattern, moved by its offset, falls on the path: the theme hides
  // an unchecked tick by offsetting a dash of the path's whole length. Two periods from the offset
  // cover the path or a whole period of it, which shows part of every dash.
  const isDashShown = (geometry: SVGGeometryElement) => {
    const { strokeDasharray, strokeDashoffset } = style(geometry);

    if (strokeDasharray === "none") return true;
    const dashes = strokeDasharray.split(/[\s,]+/).map(Number.parseFloat);
    const pattern = dashes.length % 2 === 0 ? dashes : [...dashes, ...dashes];
    const period = pattern.reduce((sum, dash) => sum + dash, 0);

    // A pattern of zeros draws the stroke whole.
    if (period <= 0) return true;

    const length = geometry.hasAttribute("pathLength")
      ? geometry.pathLength.baseVal
      : geometry.getTotalLength();

    const start = -(((Number.parseFloat(strokeDashoffset) % period) + period) % period);
    const twice = [...pattern, ...pattern];

    return twice.some((dash, index) => {
      const from = start + twice.slice(0, index).reduce((sum, before) => sum + before, 0);

      return index % 2 === 0 && dash > 0 && from < length && from + dash > 0;
    });
  };

  // focus, WCAG 2.4.7, 1.4.11, 2.4.11 and at kit 2.4.13's 2px: what focusing an element repaints
  // in it, its ancestors, its descendants, its labels or its active descendant.
  const paints = [
    "box-shadow",
    "background-color",
    "background-image",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "color",
    "text-decoration-line",
    "opacity",
    "transform",
    "scale",
    "translate",
    "filter",
    "fill",
    "stroke",
    "visibility",
    "content",
  ];

  // Chromium keeps a computed outline-width under outline-style: none, so the outline counts as
  // a whole, with how much of it shows. A transparent one, drawn for forced colors, shows nothing
  // outside them; under them, the browser computes it as a system color.
  const ringOf = (element: Element, pseudo?: Pseudo) => {
    const { outlineStyle, outlineWidth, outlineColor, outlineOffset } = style(element, pseudo);
    const alpha = alphaOf(element, pseudo);

    return alpha === 0 || ["none", "hidden"].includes(outlineStyle) || rgba(outlineColor)[3] === 0
      ? "none"
      : `${outlineStyle} ${outlineWidth} ${outlineColor} ${outlineOffset} ${alpha}`;
  };

  // A box's box-shadow, with how much of it shows.
  const shadowOf = (element: Element, pseudo?: Pseudo) => {
    const alpha = alphaOf(element, pseudo);

    return alpha === 0 ? "none" : `${style(element, pseudo).boxShadow} ${alpha}`;
  };

  // The colors of the rings a box-shadow draws, as they show: its layers with a spread, inset or
  // not. Chromium computes each layer as its color, then its lengths, then `inset`.
  const shadowRings = (element: Element, pseudo?: Pseudo) => {
    const { boxShadow } = style(element, pseudo);
    const alpha = alphaOf(element, pseudo);

    return boxShadow === "none"
      ? []
      : boxShadow.split(/,(?![^(]*\))/).flatMap((layer) => {
          const color = /^\s*([a-z-]+\([^)]*\)|[a-z]+)/.exec(layer)?.[1] ?? "";
          const spread = layer.slice(layer.indexOf(color) + color.length).match(/-?[\d.]+px/g)?.[3];

          return Number.parseFloat(spread ?? "0") > 0
            ? [{ color: faded(rgba(color), alpha), isInset: layer.includes("inset") }]
            : [];
        });
  };

  // What a box and its pseudo-elements draw, which focus and, under forced colors, state must
  // change. A box that shows nothing draws the same whatever its style; a shape's stroke shows
  // where its dash falls.
  const paintOf = (element: Element) =>
    pseudos
      .map((pseudo) => {
        const alpha = alphaOf(element, pseudo);

        if (alpha === 0) return "none";
        const computed = style(element, pseudo);
        const isDashed = element instanceof SVGGeometryElement && pseudo === undefined;

        return [
          alpha,
          isDashed && isDashShown(element),
          ringOf(element, pseudo),
          ...paints.map((property) => computed.getPropertyValue(property)),
        ].join(";");
      })
      .join("|");

  const widgetRoles = new Set(
    "button link checkbox radio switch tab option menuitem menuitemcheckbox menuitemradio slider spinbutton gridcell treeitem combobox textbox searchbox".split(
      " ",
    ),
  );

  // Natively focusable elements, and others a script focuses as widgets, such as roving items.
  const isFocusTarget = (element: Element): element is HTMLElement | SVGElement =>
    (element instanceof HTMLElement || element instanceof SVGElement) &&
    (element.matches(
      'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, [contenteditable]:not([contenteditable="false"])',
    ) ||
      (element.hasAttribute("tabindex") &&
        (element.tabIndex >= 0 || widgetRoles.has(element.getAttribute("role") ?? ""))));

  const familyOf = (element: Element) => {
    const id = element.getAttribute("aria-activedescendant");
    const activeDescendant = id === null ? null : document.getElementById(id);
    const labels = element instanceof HTMLInputElement ? [...(element.labels ?? [])] : [];

    return [
      ...new Set([
        ...ancestry(element),
        ...element.querySelectorAll("*"),
        ...labels,
        ...(activeDescendant === null ? [] : [activeDescendant]),
      ]),
    ];
  };

  const blur = () => {
    const { activeElement } = document;

    if (activeElement instanceof HTMLElement || activeElement instanceof SVGElement) {
      activeElement.blur();
    }
  };

  // A script's focus matches :focus-visible only after keyboard input, unless it asks to.
  const focusAsKeyboard = (element: HTMLElement | SVGElement) => {
    element.focus({ preventScroll: true, focusVisible: true });

    if (document.activeElement === element && !element.matches(":focus-visible")) {
      throw new Error(
        `${describe(element)} took focus without matching :focus-visible, so audit cannot see its keyboard focus style. Run audit in a browser that supports focus({ focusVisible: true }), such as Chromium or Firefox.`,
      );
    }

    return document.activeElement === element;
  };

  const reportUnchanged = (element: Element) =>
    report(
      "focus",
      element,
      "looks the same under keyboard focus, so keyboard users lose their place (WCAG 2.4.7). Give :focus-visible an outline; a box-shadow vanishes under forced colors.",
    );

  // What focus may change on a member of an element's family, read before and after: its rings
  // and shadows in the order of `pseudos`.
  type FocusLook = Readonly<{
    paint: string;
    rings: ReadonlyArray<string>;
    shadows: ReadonlyArray<string>;
  }>;

  const focusLookOf = (member: Element): FocusLook => ({
    paint: paintOf(member),
    rings: pseudos.map((pseudo) => ringOf(member, pseudo)),
    shadows: pseudos.map((pseudo) => shadowOf(member, pseudo)),
  });

  const looksBefore = (family: ReadonlyArray<Element>) =>
    new Map(family.map((member) => [member, focusLookOf(member)]));

  // A ring drawn with box-shadow: the layer that contrasts most with what is behind it.
  const checkShadow = (element: Element, shadowed: Element, pseudo: Pseudo) => {
    const measured = shadowRings(shadowed, pseudo).map(({ color, isInset }) => {
      const surface = behind(isInset ? shadowed : holderOf(shadowed));

      if (surface instanceof Element) return surface;
      const ring = over(color, surface);

      return { ring, surface, contrast: ratio(ring, surface) };
    });

    const image = measured.find((layer) => layer instanceof Element);

    if (image !== undefined) {
      reportUnmeasured(element, "focus ring", image);

      return;
    }

    const best = measured
      .flatMap((layer) => (layer instanceof Element ? [] : [layer]))
      .reduce((first, second) => (second.contrast > first.contrast ? second : first));

    if (best.contrast < 3) {
      report(
        "focus",
        element,
        `shows a focus ring of ${shown(best.contrast)} against what is behind it (${hex(best.ring)} on ${hex(best.surface)}). A focus indicator needs 3:1 to be seen (WCAG 1.4.11). Darken the ring, and draw it with an outline: a box-shadow vanishes under forced colors.`,
      );
    }
  };

  const checkRing = (
    element: Element,
    changed: ReadonlyArray<Element>,
    before: ReadonlyMap<Element, FocusLook>,
  ) => {
    const [ringed] = changed.flatMap((member) =>
      pseudos.flatMap((pseudo, index) => {
        const ring = ringOf(member, pseudo);

        return ring !== "none" && before.get(member)?.rings[index] !== ring
          ? [{ member, pseudo }]
          : [];
      }),
    );

    if (ringed === undefined) {
      const [shadowed] = changed.flatMap((member) =>
        pseudos.flatMap((pseudo, index) =>
          before.get(member)?.shadows[index] !== shadowOf(member, pseudo) &&
          shadowRings(member, pseudo).length > 0
            ? [{ member, pseudo }]
            : [],
        ),
      );

      // Any other change, such as of a background, may meet 2.4.7, but audit cannot judge whether
      // it shows. Kit, which asks for an outline anyway, reports it; AA leaves it.
      if (shadowed !== undefined) {
        checkShadow(element, shadowed.member, shadowed.pseudo);
      } else if (isKit) {
        report(
          "focus",
          element,
          "changes under keyboard focus, but with neither an outline nor a box-shadow ring, so audit cannot tell whether the change shows: a faint shift in background or color leaves keyboard users lost (WCAG 2.4.7, 1.4.11). Give :focus-visible an outline of 3:1.",
        );
      }

      return;
    }

    const { member, pseudo } = ringed;
    const { outlineColor, outlineOffset, outlineStyle, outlineWidth } = style(member, pseudo);

    // Chromium draws outline-style: auto in two colors, one of which contrasts.
    if (outlineStyle === "auto") return;
    // A pseudo-element's ring is measured against its element's surfaces.
    const isInside = Number.parseFloat(outlineOffset) < 0;
    const surface = behind(isInside ? member : holderOf(member));

    if (surface instanceof Element) {
      reportUnmeasured(element, "focus outline", surface);

      return;
    }

    const ring = over(faded(rgba(outlineColor), alphaOf(member, pseudo)), surface);
    const contrast = ratio(ring, surface);

    if (contrast < 3) {
      report(
        "focus",
        element,
        `shows a focus outline of ${shown(contrast)} against what is behind it (${hex(ring)} on ${hex(surface)}). A focus indicator needs 3:1 to be seen (WCAG 1.4.11). Darken the outline, or offset it onto a surface it contrasts with.`,
      );
    }

    if (isKit && Number.parseFloat(outlineWidth) < 2) {
      report(
        "focus",
        element,
        `shows a ${outlineWidth} focus outline. Kit asks for 2px, so the outline reads at a glance (WCAG 2.4.13). Set outline-width: 2px under :focus-visible.`,
      );
    }
  };

  // Once in view, as a browser scrolls a focused element, a sticky header must not cover it.
  const checkCovered = (element: Element) => {
    const target = seen(element);
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    const { left, top, width, height } = target.getBoundingClientRect();
    const fractions = [1 / 6, 1 / 2, 5 / 6];

    const isReached = fractions.some((x) =>
      fractions.some((y) =>
        reaches(element, document.elementFromPoint(left + width * x, top + height * y)),
      ),
    );

    if (!isReached) {
      report(
        "focus",
        element,
        "is covered once it has keyboard focus and is scrolled into view: none of 9 points across it reaches it, so keyboard users cannot see where they are (WCAG 2.4.11). Give sticky headers and footers matching scroll-padding, or move what covers it.",
      );
    }
  };

  // A composite widget whose app marks the active descendant once it hears the focus event, as
  // @foldkit/ui's Calendar marks the focused day, is checked again after the one task.
  const waitsForApp: Array<HTMLElement | SVGElement> = [];

  const checkFocus = (element: HTMLElement | SVGElement) => {
    const family = familyOf(element);
    const before = looksBefore(family);

    if (!focusAsKeyboard(element)) return;
    const changed = family.filter((member) => before.get(member)?.paint !== paintOf(member));

    if (changed.length > 0) {
      checkRing(element, changed, before);
    } else if (element.hasAttribute("aria-activedescendant")) {
      waitsForApp.push(element);
    } else {
      reportUnchanged(element);
    }

    checkCovered(element);
    blur();
  };

  // The focus events reach the app here, and two frames let it render what it made of them.
  const checkFocusThroughApp = async (element: HTMLElement | SVGElement) => {
    const before = looksBefore(familyOf(element));
    focusAsKeyboard(element);
    await nextFrame();
    await nextFrame();

    const changed = familyOf(element).filter(
      (member) => before.get(member)?.paint !== paintOf(member),
    );

    if (changed.length === 0) reportUnchanged(element);
    else checkRing(element, changed, before);
    blur();
    await nextFrame();
    await nextFrame();
  };

  // target: WCAG 2.5.8's 24px, and at kit 2.5.5's 44px under a coarse pointer, which a finger
  // needs. 9 points within half the size of the centre, less the pixel elementFromPoint may round a
  // fractional coordinate by, so a ::before hit area counts. At AA, 2.5.8's spacing exception
  // passes a smaller target whose 24px circle meets no other target; kit makes no exception.

  // 2.5.8 exempts a link in a sentence: one whose lines show text outside every link. Its lines
  // are those of the nearest block around it, read through inline boxes such as <strong> or a
  // <label> but not into blocks such as a heading beside it, nor into targets such as a button,
  // whose label is target text. An inline-block, inline-flex or inline-grid wrapper sits in a line
  // as a word does, and makes a link its flex or grid item. A list of links, a row of them under a
  // heading or beside a button, is no sentence.
  const isInline = (element: Element) => style(element).display.startsWith("inline");

  const targetSelector =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="radio"], [role="slider"], [role="tab"], [role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [tabindex="0"]';

  const showsText = (node: Node): boolean =>
    node instanceof Text
      ? node.data.trim() !== ""
      : node instanceof Element &&
        !node.matches(targetSelector) &&
        isInline(node) &&
        [...node.childNodes].some(showsText);

  const isLinkInText = (element: Element) => {
    const parent = element.parentElement;

    if (
      !element.matches("a") ||
      parent === null ||
      (style(element).display !== "inline" &&
        !["inline-flex", "inline-grid"].includes(style(parent).display))
    ) {
      return false;
    }

    const block = ancestry(parent).find((ancestor) => !isInline(ancestor));

    return block !== undefined && [...block.childNodes].some(showsText);
  };

  const isTarget = (element: Element) => element.matches(targetSelector) && !isLinkInText(element);

  const isCoarse = isKit && matchMedia("(pointer: coarse)").matches;

  const [targetSize, pointer, criterion] = isCoarse
    ? [44, "a coarse pointer, which a finger needs", "2.5.5"]
    : [24, "a fine pointer", "2.5.8"];

  const reach = targetSize / 2 - 1;

  // How many of the 9 points take the pointer, once the target is scrolled into view.
  const pointsReached = (element: Element) => {
    const target = seen(element);
    target.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    const { x, y, width, height } = target.getBoundingClientRect();
    const offsets = [-reach, 0, reach];

    return offsets
      .flatMap((dx) =>
        offsets.map((dy) => document.elementFromPoint(x + width / 2 + dx, y + height / 2 + dy)),
      )
      .filter((hit) => reaches(element, hit)).length;
  };

  const centreOf = (element: Element) => {
    const { x, y, width, height } = seen(element).getBoundingClientRect();

    return { x: x + width / 2, y: y + height / 2 };
  };

  // The first other target that a 24px circle on an undersized target's centre meets: its box, or
  // its own circle when it is undersized too. A target nested in another is one target.
  const crowderOf = (
    element: Element,
    targets: ReadonlyArray<Element>,
    undersized: ReadonlySet<Element>,
  ) => {
    const centre = centreOf(element);

    return targets.find((other) => {
      if (other.contains(element) || element.contains(other)) return false;
      const box = seen(other).getBoundingClientRect();
      const dx = centre.x - Math.min(Math.max(centre.x, box.left), box.right);
      const dy = centre.y - Math.min(Math.max(centre.y, box.top), box.bottom);
      const { x, y } = centreOf(other);

      return (
        Math.hypot(dx, dy) < 12 ||
        (undersized.has(other) && Math.hypot(centre.x - x, centre.y - y) < 24)
      );
    });
  };

  // Every target on the page is measured, since one outside the scope still crowds those in it,
  // with its own circle when it is undersized; only those in scope are reported. A target that
  // takes the pointer at none of its points, as one under a modal dialog's backdrop or in an inert
  // subtree, crowds nothing.
  const checkTargets = () => {
    const targets = [...document.body.querySelectorAll("*")].filter(
      (element) => isTarget(element) && isLive(element),
    );

    const reached = new Map(
      targets.flatMap((element) => {
        const count = pointsReached(element);

        return count < 9 ? [[element, count] as const] : [];
      }),
    );

    const undersized = new Set(reached.keys());
    const reachable = targets.filter((element) => reached.get(element) !== 0);

    // Read after the last scroll, so the boxes compare.
    for (const [element, count] of reached) {
      if (!isInScope(element)) continue;
      const points = `takes the pointer at ${count} of 9 points within ${reach}px of its centre`;

      if (isKit) {
        report(
          "target",
          element,
          `${points}. Kit asks for ${targetSize}px targets under ${pointer}, so people with tremors can hit them (WCAG ${criterion}). Make it ${targetSize}px square, or give it a ${targetSize}px ::before hit area.`,
        );

        continue;
      }

      const crowder = crowderOf(element, reachable, undersized);

      if (crowder !== undefined) {
        report(
          "target",
          element,
          `${points}, and a 24px circle on its centre meets ${describe(crowder)}. WCAG 2.2 AA asks for 24px targets, or smaller ones spaced so that such a circle meets no other target, so people with tremors hit the one they mean (2.5.8). Make it 24px square, give it a 24px ::before hit area, or move it apart.`,
        );
      }
    }
  };

  // edge, WCAG 1.4.11: what identifies a control, against what is behind it.

  // Whether a shape's fill covers any of its box, at 81 points across it: the fill of a line or
  // of a path along one, black unless set, covers none.
  const isFilled = (geometry: SVGGeometryElement) => {
    const { x, y, width, height } = geometry.getBBox();
    const steps = Array.from({ length: 9 }, (_, step) => (step + 0.5) / 9);

    return steps.some((across) =>
      steps.some((down) =>
        geometry.isPointInFill(new DOMPoint(x + width * across, y + height * down)),
      ),
    );
  };

  // The colors a control's SVG shapes paint, each as much as shows: a stroke with width where a
  // dash falls, and a fill that covers something, through the shape's opacity and its paint's.
  const markColors = (control: Element) =>
    [...control.querySelectorAll("path, circle, ellipse, line, polyline, polygon, rect, use, text")]
      .filter((graphic): graphic is SVGGraphicsElement => graphic instanceof SVGGraphicsElement)
      .flatMap((graphic) => {
        const alpha = alphaOf(graphic);
        const { stroke, strokeWidth, strokeOpacity, fill, fillOpacity } = style(graphic);
        const isGeometry = graphic instanceof SVGGeometryElement;

        const strokes =
          stroke !== "none" &&
          Number.parseFloat(strokeWidth) > 0 &&
          (!isGeometry || isDashShown(graphic))
            ? [faded(rgba(stroke), alpha * Number.parseFloat(strokeOpacity))]
            : [];

        const fills =
          fill !== "none" && (!isGeometry || isFilled(graphic))
            ? [faded(rgba(fill), alpha * Number.parseFloat(fillOpacity))]
            : [];

        return [...strokes, ...fills];
      });

  // The color among `colors` that contrasts most with the surface, or the surface itself. A color
  // that does not show at all blends into the surface.
  const strongest = (colors: ReadonlyArray<Rgba>, surface: Rgba) =>
    colors
      .map((color) => {
        const layer = over(color, surface);

        return { edge: layer, contrast: ratio(layer, surface) };
      })
      .reduce((first, second) => (second.contrast > first.contrast ? second : first), {
        edge: surface,
        contrast: 1,
      });

  // The browser draws a native checkbox, radio, range, color or file input with its own contrast.
  const isNative = (element: Element) =>
    element.matches(
      'input[type="checkbox"], input[type="radio"], input[type="range"], input[type="color"], input[type="file"]',
    ) && style(element).appearance !== "none";

  const isControl = (element: Element) =>
    element.matches(
      '[role="checkbox"], [role="switch"], [role="radio"], [role="slider"], input:not([type="hidden"], [type="button"], [type="submit"], [type="reset"], [type="image"]), select, textarea',
    );

  // Forced colors replace a field's fill with the background, so there its edge must carry it.
  // Outside them, a hairline field's fill must stand apart from what is behind it by this much:
  // fainter fills vanish on many screens. A 5% mix of the text color into the surface gives 1.09.
  const fillContrast = 1.05;

  const isHairline = (element: Element) =>
    hairline !== undefined &&
    element.matches(hairline) &&
    !matchMedia("(forced-colors: active)").matches;

  // A control is told apart by its most contrasting part: a border side, its fill, or its mark
  // while shown. A checked box may fill dark inside a border the color of the page.
  const checkEdge = (control: Element) => {
    const element = seen(control);

    if (element === control && isNative(control)) return;
    const surface = behind(holderOf(element));

    if (surface instanceof Element) {
      reportUnmeasured(element, "edge", surface);

      return;
    }

    const computed = style(element);

    const borders = ["top", "right", "bottom", "left"].flatMap((side) =>
      Number.parseFloat(computed.getPropertyValue(`border-${side}-width`)) > 0
        ? [rgba(computed.getPropertyValue(`border-${side}-color`))]
        : [],
    );

    const { edge, contrast } = strongest(
      [...borders, rgba(computed.backgroundColor), ...markColors(element)],
      surface,
    );

    if (contrast >= 3) return;

    if (!isHairline(element)) {
      report(
        "edge",
        element,
        `has an edge of ${shown(contrast)} against what is behind it (${hex(edge)} on ${hex(surface)}). A control's edge needs 3:1 so people can find it (WCAG 1.4.11). Darken its border, or its fill where it has no border.`,
      );

      return;
    }

    const filled = over(rgba(computed.backgroundColor), surface);
    const fillRatio = ratio(filled, surface);

    if (fillRatio < fillContrast) {
      report(
        "edge",
        element,
        `has an edge of ${shown(contrast)} and a fill of ${shown(fillRatio)} against what is behind it (${hex(filled)} on ${hex(surface)}). It matches hairline, which lets a field rest at a faint edge only while a fill of its own, at least ${fillContrast}:1, marks it (WCAG 1.4.11). Darken its fill, or its border to 3:1.`,
      );
    }
  };

  // A button without text is known by its mark alone, which shows nothing when no shape paints.
  const checkMark = (button: Element) => {
    if (button.querySelector("svg") === null || (button.textContent ?? "").trim() !== "") return;
    const surface = behind(button);

    if (surface instanceof Element) {
      reportUnmeasured(button, "mark", surface);

      return;
    }

    const { edge: drawn, contrast } = strongest(markColors(button), surface);

    if (contrast < 3) {
      report(
        "edge",
        button,
        `draws its mark at ${shown(contrast)} against what is behind it (${hex(drawn)} on ${hex(surface)}). A button without text is known by its mark, which needs 3:1 (WCAG 1.4.11). Darken the mark.`,
      );
    }
  };

  // reflow, WCAG 1.4.10: the page must not scroll inline. Boxes in a scroller or a clipping box,
  // and fixed boxes, which scroll with nothing, take no part in that; a fixed box and what it
  // holds must instead fit the viewport. Content a clipping ancestor cuts off, at the page's edge
  // or not, goes unseen.
  const page = document.scrollingElement ?? document.documentElement;

  const isHeld = (element: Element) =>
    ancestry(element).some((current) => {
      const { overflowX, position } = style(current);
      const isBox = current !== element && current !== page && current !== document.body;

      return position === "fixed" || (isBox && overflowX !== "visible");
    });

  const overflowOf = (element: Element) => {
    const { left, right } = element.getBoundingClientRect();

    return { left: -(left + scrollX), right: right + scrollX - page.clientWidth };
  };

  const checkReflow = () => {
    if (page.scrollWidth <= page.clientWidth) return;

    const out = new Set(
      [...document.body.querySelectorAll("*")].filter((element) => {
        const { left, right } = overflowOf(element);

        return (left > 1 || right > 1) && !isHeld(element);
      }),
    );

    const outermost = [...out].filter(
      (element) => element.parentElement === null || !out.has(element.parentElement),
    );

    for (const element of outermost.length === 0 ? [page] : outermost.filter(isInScope)) {
      const { left, right } = overflowOf(element);
      const side = left > 1 ? "left" : "right";

      report(
        "reflow",
        element,
        `reaches ${Math.round(Math.max(left, right))}px past the ${side} edge of a ${page.clientWidth}px wide viewport, so the page scrolls sideways and people who zoom must scroll both ways to read (WCAG 1.4.10). Let it wrap or shrink, or put it in a container with overflow-x: auto.`,
      );
    }
  };

  // The fixed box an element is or lies in, unless a box between them clips or scrolls its
  // overflow, which keeps it from the edge.
  const fixedBoxOf = (element: Element) => {
    for (const current of ancestry(element)) {
      const { overflowX, position } = style(current);

      if (current !== element && overflowX !== "visible") return undefined;

      if (position === "fixed") return current;
    }

    return undefined;
  };

  // A box wholly outside the viewport is hidden on purpose, as a closed drawer is.
  const isPastEdge = (element: Element) => {
    const { left, right } = element.getBoundingClientRect();
    const width = page.clientWidth;

    return right > 0 && left < width && (left < -1 || right > width + 1);
  };

  const checkFixed = () => {
    const out = new Set(
      elements.filter((element) => fixedBoxOf(element) !== undefined && isPastEdge(element)),
    );

    for (const element of out) {
      if (element.parentElement !== null && out.has(element.parentElement)) continue;
      const box = fixedBoxOf(element) ?? element;
      const { left, right } = element.getBoundingClientRect();
      const width = page.clientWidth;
      const side = left < -1 ? "left" : "right";
      const fixed = box === element ? "It is fixed" : `It lies in ${describe(box)}, which is fixed`;

      report(
        "reflow",
        element,
        `reaches ${Math.round(Math.max(-left, right - width))}px past the ${side} edge of a ${width}px wide viewport. ${fixed}, so it does not scroll, and what lies past the edge cannot be reached at all (WCAG 1.4.10). Give it max-inline-size: 100% and let its content wrap.`,
      );
    }
  };

  // clipped, WCAG 1.4.10 and 1.4.12: text that a box hiding its overflow cuts off.
  const hasText = (element: Element) =>
    [...element.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
    );

  const textBoxes = (element: Element): ReadonlyArray<Box> => {
    const fontSize = Number.parseFloat(style(element).fontSize);
    const range = document.createRange();

    return [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "")
      .flatMap((node) => {
        range.selectNodeContents(node);

        // The em box, not the glyph box: line-height: 1 in a box of that height trims only the
        // space above and below the glyphs.
        return [...range.getClientRects()].map(({ left, right, top, bottom }) => ({
          left,
          right,
          top: (top + bottom - fontSize) / 2,
          bottom: (top + bottom + fontSize) / 2,
        }));
      });
  };

  const clips = (value: string) => value === "hidden" || value === "clip";

  const scrolls = (value: string) => value === "auto" || value === "scroll";

  // Whether an ancestor is, or contains, the containing block of a box positioned as `position`,
  // so that its overflow clips the box.
  const contains = (ancestor: Element, position: string) => {
    const { position: own, transform } = style(ancestor);

    if (position === "fixed") return transform !== "none";

    return position !== "absolute" || own !== "static" || transform !== "none";
  };

  // The boxes that clip an element's text, nearest first, up to the first scroller, whose
  // overflow people reach by scrolling.
  const clippersOf = (element: Element): ReadonlyArray<Element> => {
    const found: Array<Element> = [];
    let position = style(element).position;

    for (const current of ancestry(element)) {
      const { overflowX, overflowY, position: own } = style(current);

      if (current === element || contains(current, position)) {
        if (clips(overflowX) || clips(overflowY)) found.push(current);

        if (scrolls(overflowX) || scrolls(overflowY)) break;
        position = own;
      }
    }

    return found;
  };

  const isTiny = (element: Element) => {
    const { width, height } = element.getBoundingClientRect();

    return width <= 1 || height <= 1;
  };

  // Whether a clipper shows part of the text but not all of it. Text it hides entirely, such as
  // a collapsed panel's, is hidden on purpose.
  const cuts = (clipper: Element, boxes: ReadonlyArray<Box>) => {
    const { overflowX, overflowY } = style(clipper);
    const rect = clipper.getBoundingClientRect();
    const left = rect.left + clipper.clientLeft;
    const top = rect.top + clipper.clientTop;
    const right = left + clipper.clientWidth;
    const bottom = top + clipper.clientHeight;

    const isVisible = boxes.some(
      (box) => box.right > left && box.left < right && box.bottom > top && box.top < bottom,
    );

    const isCut = boxes.some(
      (box) =>
        (clips(overflowX) && (box.left < left - 1 || box.right > right + 1)) ||
        (clips(overflowY) && (box.top < top - 1 || box.bottom > bottom + 1)),
    );

    return isVisible && isCut;
  };

  const isEllipsized = (element: Element) =>
    style(element).textOverflow === "ellipsis" && element.scrollWidth > element.clientWidth;

  // The box that cuts an element's text, or the element itself when it ends in an ellipsis.
  const cutterOf = (element: Element) => {
    if (isEllipsized(element)) return element;
    const boxes = textBoxes(element);

    return boxes.length === 0
      ? undefined
      : clippersOf(element).find((clipper) => cuts(clipper, boxes));
  };

  const cutText = (texts: ReadonlyArray<Element>) =>
    new Map(
      texts.flatMap((element) => {
        const cutter = cutterOf(element);

        return cutter === undefined ? [] : [[element, cutter] as const];
      }),
    );

  const by = (element: Element, cutter: Element) =>
    cutter === element ? "its own box" : describe(cutter);

  const spacing = new CSSStyleSheet();
  spacing.replaceSync(
    "*, ::before, ::after { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }",
  );

  // Read at rest: a transition on a focus ring would otherwise show its first frame.
  const still = new CSSStyleSheet();
  still.replaceSync("*, ::before, ::after { transition: none !important; }");
  // A copy: the property returns a live array, which assigning to it would change.
  const adopted = [...document.adoptedStyleSheets];

  const checkClipped = () => {
    const texts = elements.filter(
      (element) =>
        !(element instanceof SVGElement) &&
        element.closest("select") === null &&
        !ancestry(element).some(isTiny) &&
        hasText(element),
    );

    const asRendered = cutText(texts);
    document.adoptedStyleSheets = [...adopted, still, spacing];
    const whenSpaced = cutText(texts.filter((element) => !asRendered.has(element)));
    document.adoptedStyleSheets = [...adopted, still];

    for (const [element, cutter] of asRendered) {
      report(
        "clipped",
        element,
        isEllipsized(element)
          ? "ends in an ellipsis, so part of its text cannot be read (WCAG 1.4.10). Let the text wrap instead of truncating it."
          : `is cut off by ${by(element, cutter)}, which hides its overflow, so part of the text cannot be read (WCAG 1.4.10). Let the box grow with its text, or let the text wrap.`,
      );
    }

    for (const [element, cutter] of whenSpaced) {
      report(
        "clipped",
        element,
        `is cut off by ${by(element, cutter)} once WCAG 1.4.12's text spacing applies (line height 1.5, letter spacing 0.12em, word spacing 0.16em), so people who widen the spacing lose text. Size the box with min-height and padding instead of a fixed height.`,
      );
    }
  };

  // state, WCAG 1.4.1 and 1.4.11 under forced colors: the system replaces every color, so a
  // state drawn in a color of the page's own disappears.
  const states = [
    "aria-checked",
    "aria-selected",
    "aria-pressed",
    "aria-current",
    "data-active",
    "data-focused",
    "data-today",
  ];

  const stateOf = (element: Element) =>
    states
      .flatMap((attribute) => {
        const value = element.getAttribute(attribute);

        return value === null || value === "false" ? [] : [`${attribute}="${value}"`];
      })
      .join(" ");

  const peersOf = (element: Element) => {
    const role = element.getAttribute("role");

    return role === null ? `${element.tagName.toLowerCase()}:not([role])` : `[role="${role}"]`;
  };

  // The nearest container that holds another element of the same role.
  const containerOf = (element: Element, peers: string): Element | null => {
    const parent = element.parentElement;

    return parent === null || parent.querySelectorAll(peers).length > 1
      ? parent
      : containerOf(parent, peers);
  };

  const lookOf = (element: Element) =>
    [element, ...element.querySelectorAll("*")].map(paintOf).join("/");

  const checkState = (element: Element) => {
    const state = stateOf(element);
    const peers = peersOf(element);
    const container = containerOf(element, peers);

    if (state === "" || container === null) return;
    const look = lookOf(element);

    const twin = [...container.querySelectorAll(peers)].find(
      (peer) =>
        peer !== element &&
        elements.includes(peer) &&
        stateOf(peer) !== state &&
        lookOf(peer) === look,
    );

    if (twin !== undefined) {
      report(
        "state",
        element,
        `(${state}) paints the same as ${describe(twin)} under forced colors, so its state disappears when the system replaces colors (WCAG 1.4.1, 1.4.11). Draw the state in a system color, such as Highlight, or with a border or mark.`,
      );
    }
  };

  // Restoring: scroll positions of every scroller, and focus with its :focus-visible state.
  const active = document.activeElement;
  const wasFocusVisible = active?.matches(":focus-visible") ?? false;

  const scrolled = [...document.querySelectorAll("*")].flatMap((element) =>
    element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
      ? [{ element, left: element.scrollLeft, top: element.scrollTop }]
      : [],
  );

  const restoreFocus = () => {
    if (
      (active instanceof HTMLElement || active instanceof SVGElement) &&
      active !== document.body
    ) {
      active.focus({ preventScroll: true, focusVisible: wasFocusVisible });
    } else {
      blur();
    }
  };

  const measure = () => {
    if (isKit && reducedMotion) checkMotion();
    blur();
    elements.filter(isFocusTarget).forEach(checkFocus);

    checkTargets();
    elements.filter(isControl).forEach(checkEdge);
    elements
      .filter((element) => element.matches('button:not([role]), [role="button"]'))
      .forEach(checkMark);
    checkReflow();
    checkFixed();
    checkClipped();

    if (matchMedia("(forced-colors: active)").matches) {
      const selector = states.map((attribute) => `[${attribute}]`).join(", ");
      elements.filter((element) => element.matches(selector)).forEach(checkState);
    }
  };

  // One task from here: the app's next frame sees the page as it was. Capture listeners on window
  // run first, so stopping focus events there keeps them from the app.
  const hideFocusEvent = (event: Event) => event.stopImmediatePropagation();
  const focusEvents = ["focus", "blur", "focusin", "focusout"];

  const restore = () => {
    for (const { element, left, top } of scrolled) {
      element.scrollTo({ left, top, behavior: "instant" });
    }

    restoreFocus();
    // Restyle with transitions off, so restoring the page starts none.
    document.documentElement.getBoundingClientRect();
    document.adoptedStyleSheets = adopted;

    for (const type of focusEvents) window.removeEventListener(type, hideFocusEvent, true);
  };

  for (const type of focusEvents) window.addEventListener(type, hideFocusEvent, true);
  document.adoptedStyleSheets = [...adopted, still];

  try {
    measure();
  } finally {
    restore();
  }

  for (const element of waitsForApp) await checkFocusThroughApp(element);

  if (waitsForApp.length > 0) restoreFocus();

  return findings;
};

/**
 * One browser context per axis, at 1280×720: light, dark, reduced-motion, forced-colors-light and
 * forced-colors-dark, which crosses forced colors with the scheme that picks Chromium's forced
 * palette; narrow, at 320×640, which is 400% zoom of 1280px (WCAG 1.4.10); and touch, a 320×640
 * phone whose coarse pointer raises the kit's targets to 44px where the room for them is least.
 * Each value fits Playwright's `use` and a Vitest browser instance's context options.
 */
export const variations = [
  {
    name: "light",
    colorScheme: "light",
    reducedMotion: "no-preference",
    forcedColors: "none",
    hasTouch: false,
    viewport: { width: 1280, height: 720 },
  },
  {
    name: "dark",
    colorScheme: "dark",
    reducedMotion: "no-preference",
    forcedColors: "none",
    hasTouch: false,
    viewport: { width: 1280, height: 720 },
  },
  {
    name: "reduced-motion",
    colorScheme: "light",
    reducedMotion: "reduce",
    forcedColors: "none",
    hasTouch: false,
    viewport: { width: 1280, height: 720 },
  },
  {
    name: "forced-colors-light",
    colorScheme: "light",
    reducedMotion: "no-preference",
    forcedColors: "active",
    hasTouch: false,
    viewport: { width: 1280, height: 720 },
  },
  {
    name: "forced-colors-dark",
    colorScheme: "dark",
    reducedMotion: "no-preference",
    forcedColors: "active",
    hasTouch: false,
    viewport: { width: 1280, height: 720 },
  },
  {
    name: "narrow",
    colorScheme: "light",
    reducedMotion: "no-preference",
    forcedColors: "none",
    hasTouch: false,
    viewport: { width: 320, height: 640 },
  },
  {
    name: "touch",
    colorScheme: "light",
    reducedMotion: "no-preference",
    forcedColors: "none",
    hasTouch: true,
    viewport: { width: 320, height: 640 },
  },
] as const satisfies ReadonlyArray<Variation>;
