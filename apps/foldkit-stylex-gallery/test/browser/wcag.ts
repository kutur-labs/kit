// WCAG 2.2 checks from computed styles, run in the page. `installWcag` runs before the page's
// scripts and leaves the color math on `window.wcag`, which each check reads: Playwright sends a
// check to the page as source, so it cannot close over helpers defined here.
import type { Page } from "playwright";

type Rgba = readonly [number, number, number, number];

type Wcag = Readonly<{
  /** Any color the page computes, as 8-bit channels and alpha. */
  rgba: (color: string) => Rgba;
  /** What is painted behind an element: its own and its ancestors' backgrounds over the canvas. */
  behind: (element: Element) => Rgba;
  over: (top: Rgba, bottom: Rgba) => Rgba;
  /** The product of the element's and its ancestors' opacity. */
  opacity: (element: Element) => number;
  ratio: (first: Rgba, second: Rgba) => number;
  /** Visible, enabled elements under `root`, `root` included. WCAG exempts the rest. */
  scope: (root: string) => ReadonlyArray<Element>;
  describe: (element: Element) => string;
}>;

declare global {
  interface Window {
    wcag?: Wcag;
  }
}

/** A rule an element breaks, with the value measured. */
export type Finding = Readonly<{ element: string; rule: string; measured: number }>;

export const installWcag = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  // The canvas parses every color syntax the page may compute, such as color(srgb ...).
  const rgba = (color: string): Rgba => {
    if (context === null) throw new Error("No 2D canvas to read colors with.");

    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;

    return [r, g, b, a / 255];
  };

  const over = (top: Rgba, bottom: Rgba): Rgba => {
    const alpha = top[3] + bottom[3] * (1 - top[3]);

    const channel = (index: 0 | 1 | 2) =>
      alpha === 0 ? 0 : (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha;

    return [channel(0), channel(1), channel(2), alpha];
  };

  const ancestry = (element: Element): ReadonlyArray<Element> =>
    element.parentElement === null ? [element] : [element, ...ancestry(element.parentElement)];

  // The canvas color in the scheme in use, which <html> paints when it sets no background.
  const pageCanvas = () => {
    const probe = document.body.appendChild(document.createElement("div"));
    probe.style.backgroundColor = "Canvas";
    const color = rgba(getComputedStyle(probe).backgroundColor);
    probe.remove();

    return color;
  };

  const behind = (element: Element): Rgba =>
    ancestry(element)
      .map((current) => rgba(getComputedStyle(current).backgroundColor))
      .reduceRight((below, layer) => over(layer, below), pageCanvas());

  const opacity = (element: Element) =>
    ancestry(element).reduce(
      (product, current) => product * Number(getComputedStyle(current).opacity),
      1,
    );

  const luminance = ([r, g, b]: Rgba) => {
    const linear = (channel: number) =>
      channel / 255 <= 0.04045 ? channel / 255 / 12.92 : ((channel / 255 + 0.055) / 1.055) ** 2.4;

    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };

  const ratio = (first: Rgba, second: Rgba) => {
    const [a, b] = [luminance(first), luminance(second)];

    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  const scope = (root: string) =>
    Array.from(document.querySelectorAll(`${root}, ${root} *`)).filter(
      (element) =>
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility === "visible" &&
        opacity(element) > 0 &&
        element.closest('[disabled], [aria-disabled="true"], [data-disabled]') === null,
    );

  const describe = (element: Element) =>
    `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""} "${(element.textContent ?? "").trim().slice(0, 40)}"`;

  window.wcag = { rgba, behind, over, opacity, ratio, scope, describe };
};

// 1.4.3: 4.5:1, or 3:1 from 24px or bold 18.66px, against what is painted behind the text.
const textContrast = (root: string): ReadonlyArray<Finding> => {
  const { wcag } = window;

  if (wcag === undefined) throw new Error("Open the page with open() from useGallery.");

  return wcag
    .scope(root)
    .filter((element) =>
      Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
      ),
    )
    .flatMap((element) => {
      const style = getComputedStyle(element);
      const [r, g, b, a] = wcag.rgba(style.color);
      const background = wcag.behind(element);

      const measured = wcag.ratio(
        wcag.over([r, g, b, a * wcag.opacity(element)], background),
        background,
      );

      const size = Number.parseFloat(style.fontSize);
      const isLarge = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);

      return measured < (isLarge ? 3 : 4.5)
        ? [{ element: wcag.describe(element), rule: "text contrast", measured }]
        : [];
    });
};

// 1.4.11: 3:1 for the edge that identifies a control, its border or, without one, its fill. A
// visually hidden input, such as FileDrop's, shows no edge: its label is the control people see,
// so the label must carry the edge.
const controlEdges = (root: string): ReadonlyArray<Finding> => {
  const { wcag } = window;

  if (wcag === undefined) throw new Error("Open the page with open() from useGallery.");

  const shown = (control: Element) => {
    const { width, height } = control.getBoundingClientRect();
    const label = control instanceof HTMLInputElement ? control.labels?.[0] : undefined;

    return width <= 1 && height <= 1 && label !== undefined ? label : control;
  };

  return wcag
    .scope(root)
    .filter((element) =>
      element.matches(
        '[role="checkbox"], [role="switch"], [role="radio"], [role="slider"], input:not([type="hidden"]), select, textarea',
      ),
    )
    .flatMap((control) => {
      const element = shown(control);
      const style = getComputedStyle(element);
      const border = wcag.rgba(style.borderTopColor);
      const hasBorder = Number.parseFloat(style.borderTopWidth) > 0 && border[3] > 0;
      const surroundings = wcag.behind(element.parentElement ?? document.documentElement);
      const edge = wcag.over(hasBorder ? border : wcag.rgba(style.backgroundColor), surroundings);
      const measured = wcag.ratio(edge, surroundings);

      return measured < 3
        ? [{ element: wcag.describe(element), rule: "control edge", measured }]
        : [];
    });
};

// 2.5.5: a 44px square around a control's centre activates it, its ::before included.
const targetSizes = (root: string): ReadonlyArray<Finding> => {
  const { wcag } = window;

  if (wcag === undefined) throw new Error("Open the page with open() from useGallery.");
  // Half of 44px, less the pixel elementFromPoint may round a fractional coordinate by.
  const reach = 21;
  const offsets = [-reach, 0, reach];

  return wcag
    .scope(root)
    .filter((element) =>
      element.matches(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="checkbox"], [role="switch"], [role="radio"], [role="slider"], [role="tab"], [role="option"], [role="menuitem"], [tabindex="0"]',
      ),
    )
    .flatMap((element) => {
      element.scrollIntoView({ block: "center", inline: "center" });
      const { x, y, width, height } = element.getBoundingClientRect();

      const hits = offsets.flatMap((dx) =>
        offsets.map((dy) => document.elementFromPoint(x + width / 2 + dx, y + height / 2 + dy)),
      );

      const measured = hits.filter(
        (hit) =>
          hit !== null && (element.contains(hit) || hit.closest("label")?.control === element),
      ).length;

      return measured < hits.length
        ? [{ element: wcag.describe(element), rule: "44px target, points hit of 9", measured }]
        : [];
    });
};

/**
 * Checks every visible, enabled element under `root` from computed styles: text contrast, the
 * edges of checkboxes, switches, radios, sliders and fields, and 44px pointer targets.
 */
export const audit = async (page: Page, root: string): Promise<ReadonlyArray<Finding>> => [
  ...(await page.evaluate(textContrast, root)),
  ...(await page.evaluate(controlEdges, root)),
  ...(await page.evaluate(targetSizes, root)),
];
