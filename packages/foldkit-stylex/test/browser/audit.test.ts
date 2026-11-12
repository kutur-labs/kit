// audit on plain HTML, once per variation: a fixture that passes and one that fails per rule, each
// failure exactly one finding, then settling, scope, levels, throws and what audit leaves behind.
// Fixtures that measure colors set forced-color-adjust: none, so they read the same under forced
// colors; the motion and state rules apply under reduced motion and forced colors alone.
import { describe, expect, it, onTestFinished } from "vitest";
import { page } from "vitest/browser";

import { audit, recordMotion } from "../../src/testing.ts";

recordMotion();

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const forcedColors = matchMedia("(forced-colors: active)").matches;

// A page that passes every rule, which each fixture breaks in one place.
const passing = `<style>
  body { margin: 0; background: #fff; color: #000; font: 16px/1.5 sans-serif; }
  button { min-width: 44px; min-height: 44px; }
  :focus-visible { outline: 2px solid #000; outline-offset: 2px; }
  .own-colors { background: #fff; forced-color-adjust: none; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>`;

const render = (html: string) => {
  const fixture = document.body.appendChild(document.createElement("div"));
  fixture.innerHTML = passing + html;
  onTestFinished(() => fixture.remove());

  return fixture;
};

const element = (selector: string) => {
  const found = document.querySelector<HTMLElement>(selector);

  if (found === null) throw new Error(`The fixture has no ${selector}.`);

  return found;
};

const afterFrames = async (count: number) => {
  for (let frame = 0; frame < count; frame += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

describe("edge", () => {
  it("passes a checkbox whose border reaches 3:1", async () => {
    render(
      `<div class="own-colors"><button role="checkbox" aria-checked="false" id="terms" aria-label="Terms" style="border: 2px solid #949494; background: #fff"></button></div>`,
    );

    expect(await audit()).toEqual([]);
  });

  it("reports a checkbox whose border stays below 3:1", async () => {
    render(
      `<div class="own-colors"><button role="checkbox" aria-checked="false" id="terms" aria-label="Terms" style="border: 2px solid #c8c8c8; background: #fff"></button></div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "edge",
        at: 'button#terms "Terms"',
        message:
          'button#terms "Terms" has an edge of 1.67:1 against what is behind it (#c8c8c8 on #ffffff). A control\'s edge needs 3:1 so people can find it (WCAG 1.4.11). Darken its border, or its fill where it has no border.',
      },
    ]);
  });

  it("measures a visually hidden input through its label", async () => {
    render(
      `<div class="own-colors"><input type="file" id="upload" class="visually-hidden"><label for="upload" style="display: inline-block; padding: 12px; border: 1px dashed #c8c8c8">Drop a file</label></div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "edge",
        at: 'label "Drop a file"',
        message:
          'label "Drop a file" has an edge of 1.67:1 against what is behind it (#c8c8c8 on #ffffff). A control\'s edge needs 3:1 so people can find it (WCAG 1.4.11). Darken its border, or its fill where it has no border.',
      },
    ]);
  });

  it("measures a control that overflows its parent against what lies behind the parent", async () => {
    render(
      `<div class="own-colors" style="padding: 16px 0"><div style="display: flex; align-items: center; height: 4px; background: #222"><div role="slider" aria-label="Volume" aria-valuenow="50" style="width: 16px; height: 16px; box-sizing: border-box; border: 1px solid #000; border-radius: 50%; background: #fff"></div></div></div>`,
    );

    expect(await audit({ level: "AA" })).toEqual([]);
  });

  // A text field drawn as many design systems draw them: a hairline and a fill at rest.
  const field = (fill: string) =>
    `<div class="own-colors"><input id="name" aria-label="Name" style="height: 44px; border: 1px solid #e5e5e5; background: ${fill}"></div>`;

  it("reports a field with a faint edge that hairline does not name", async () => {
    render(field("#f2f2f2"));

    expect(await audit()).toEqual([
      {
        rule: "edge",
        at: 'input#name "Name"',
        message:
          'input#name "Name" has an edge of 1.25:1 against what is behind it (#e5e5e5 on #ffffff). A control\'s edge needs 3:1 so people can find it (WCAG 1.4.11). Darken its border, or its fill where it has no border.',
      },
    ]);
  });

  it.runIf(!forcedColors)(
    "passes a field that hairline names while a fill of its own marks it",
    async () => {
      render(field("#f2f2f2"));

      expect(await audit({ hairline: "input" })).toEqual([]);
    },
  );

  it.runIf(!forcedColors).each([
    { fill: "transparent", shown: "#ffffff", ratio: "1" },
    { fill: "#fcfcfc", shown: "#fcfcfc", ratio: "1.02" },
  ])(
    "reports a field that hairline names but $fill fills too faintly to see",
    async ({ fill, shown, ratio }) => {
      render(field(fill));

      expect(await audit({ hairline: "input" })).toEqual([
        {
          rule: "edge",
          at: 'input#name "Name"',
          message: `input#name "Name" has an edge of 1.25:1 and a fill of ${ratio}:1 against what is behind it (${shown} on #ffffff). It matches hairline, which lets a field rest at a faint edge only while a fill of its own, at least 1.05:1, marks it (WCAG 1.4.11). Darken its fill, or its border to 3:1.`,
        },
      ]);
    },
  );

  it.runIf(forcedColors)(
    "asks a field that hairline names for a 3:1 edge under forced colors, which drop its fill",
    async () => {
      render(field("#f2f2f2"));

      expect((await audit({ hairline: "input" })).map(({ rule, at }) => ({ rule, at }))).toEqual([
        { rule: "edge", at: 'input#name "Name"' },
      ]);
    },
  );

  it("passes a control by its most contrasting part: a dark fill inside a light border, or an underline", async () => {
    render(
      `<div class="own-colors"><button role="checkbox" aria-checked="true" id="terms" aria-label="Terms" style="border: 2px solid #fff; background: #333"></button><input id="name" aria-label="Name" style="height: 44px; border: 0; border-bottom: 2px solid #555; background: transparent"></div>`,
    );

    expect(await audit()).toEqual([]);
  });

  // A faint box with a black tick, which `svg` and `path` style.
  const ticked = (svg: string, path: string) =>
    `<div class="own-colors"><button role="checkbox" aria-checked="false" id="terms" aria-label="Terms" style="border: 0; background: #f4f4f4"><svg viewBox="0 0 16 16" width="16" height="16" style="${svg}"><path d="M2 8 6 12 14 4" pathLength="1" stroke="#000" fill="none" stroke-width="2" style="${path}"/></svg></button></div>`;

  it.each([
    { shown: "a dash", path: "stroke-dasharray: 1; stroke-dashoffset: 0" },
    { shown: "a fill under a stroke of no width", path: "stroke-width: 0; fill: #000" },
  ])("passes a faint box by a tick that shows by $shown", async ({ path }) => {
    render(ticked("", path));

    expect(await audit()).toEqual([]);
  });

  it.each([
    { hidden: "the SVG's opacity", svg: "opacity: 0", path: "" },
    { hidden: "the path's opacity", svg: "", path: "opacity: 0" },
    { hidden: "an opacity of 0.01", svg: "", path: "opacity: 0.01" },
    { hidden: "its stroke-opacity", svg: "", path: "stroke-opacity: 0" },
    {
      hidden: "the fill-opacity of its fill",
      svg: "",
      path: "stroke: none; fill: #000; fill-opacity: 0",
    },
    {
      hidden: "a dash offset of its length",
      svg: "",
      path: "stroke-dasharray: 1; stroke-dashoffset: 1",
    },
    { hidden: "a scale of 0", svg: "", path: "transform: scale(0)" },
  ])(
    "reports a faint box whose tick $hidden hides or fades, however dark the tick",
    async ({ svg, path }) => {
      render(ticked(svg, path));

      expect(await audit()).toEqual([
        {
          rule: "edge",
          at: 'button#terms "Terms"',
          message:
            'button#terms "Terms" has an edge of 1.09:1 against what is behind it (#f4f4f4 on #ffffff). A control\'s edge needs 3:1 so people can find it (WCAG 1.4.11). Darken its border, or its fill where it has no border.',
        },
      ]);
    },
  );

  it("reports a control over a gradient as one it cannot measure", async () => {
    render(
      `<div class="own-colors" id="backdrop" style="background: linear-gradient(#111, #222); padding: 20px"><input id="name" aria-label="Name" style="height: 44px; border: 1px solid #333; background: transparent; color: #fff"></div>`,
    );

    // Its focus outline lies over the gradient too.
    expect(await audit()).toEqual([
      {
        rule: "unmeasured",
        at: 'input#name "Name"',
        message:
          'input#name "Name" cannot be measured: its focus outline lies over the background image or gradient of div#backdrop, so audit cannot measure the backdrop (WCAG 1.4.11). Check that the focus outline reaches 3:1 against every part of the image, then exclude the element or drop this finding.',
      },
      {
        rule: "unmeasured",
        at: 'input#name "Name"',
        message:
          'input#name "Name" cannot be measured: its edge lies over the background image or gradient of div#backdrop, so audit cannot measure the backdrop (WCAG 1.4.11). Check that the edge reaches 3:1 against every part of the image, then exclude the element or drop this finding.',
      },
    ]);
  });

  // A button without text whose mark `path` draws.
  const iconButton = (path: string) =>
    `<div class="own-colors"><button id="close" aria-label="Close" style="border: 0; background: #fff"><svg viewBox="0 0 16 16" width="16" height="16">${path}</svg></button></div>`;

  const faintMark = {
    rule: "edge",
    at: 'button#close "Close"',
    message:
      'button#close "Close" draws its mark at 1.67:1 against what is behind it (#c8c8c8 on #ffffff). A button without text is known by its mark, which needs 3:1 (WCAG 1.4.11). Darken the mark.',
  };

  // The line's fill, black unless set, covers nothing.
  it("measures a button without text by its mark", async () => {
    render(iconButton(`<path d="M2 2 14 14" stroke="#c8c8c8" stroke-width="2"/>`));

    expect(await audit()).toEqual([faintMark]);
  });

  it.each([
    { fill: "#000", found: [] },
    { fill: "#c8c8c8", found: [faintMark] },
  ])(
    "measures an icon filled with $fill under a stroke of no width by its fill",
    async ({ fill, found }) => {
      render(
        iconButton(`<path d="M4 4h8v8H4z" stroke="currentColor" fill="${fill}" stroke-width="0"/>`),
      );

      expect(await audit()).toEqual(found);
    },
  );

  // A halo: the stroke blends into the button, and the fill inside it draws the mark.
  it("measures an icon by its fill when its stroke matches the button", async () => {
    render(iconButton(`<path d="M4 4h8v8H4z" style="stroke: #fff; fill: #000" stroke-width="2"/>`));

    expect(await audit()).toEqual([]);
  });
});

describe("focus", () => {
  it("passes a 2px outline that reaches 3:1", async () => {
    render(`<div class="own-colors"><button>Save</button></div>`);

    expect(await audit()).toEqual([]);
  });

  const unchanged = {
    rule: "focus",
    at: 'button#save "Save"',
    message:
      'button#save "Save" looks the same under keyboard focus, so keyboard users lose their place (WCAG 2.4.7). Give :focus-visible an outline; a box-shadow vanishes under forced colors.',
  };

  it("reports a control that looks the same under keyboard focus", async () => {
    render(`<style>#save:focus-visible { outline: none; }</style><button id="save">Save</button>`);

    expect(await audit()).toEqual([unchanged]);
  });

  it("reports an outline below 3:1", async () => {
    render(
      `<style>#save:focus-visible { outline-color: #c8c8c8; }</style><div class="own-colors"><button id="save">Save</button></div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "focus",
        at: 'button#save "Save"',
        message:
          'button#save "Save" shows a focus outline of 1.67:1 against what is behind it (#c8c8c8 on #ffffff). A focus indicator needs 3:1 to be seen (WCAG 1.4.11). Darken the outline, or offset it onto a surface it contrasts with.',
      },
    ]);
  });

  it("reports a 1px outline at kit and passes it at AA", async () => {
    render(
      `<style>#save:focus-visible { outline-width: 1px; }</style><button id="save">Save</button>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "focus",
        at: 'button#save "Save"',
        message:
          'button#save "Save" shows a 1px focus outline. Kit asks for 2px, so the outline reads at a glance (WCAG 2.4.13). Set outline-width: 2px under :focus-visible.',
      },
    ]);
    expect(await audit({ level: "AA" })).toEqual([]);
  });

  it("passes a box-shadow ring of 3:1 beside a transparent outline, which forced colors draw", async () => {
    render(
      `<style>#save:focus-visible { outline: 2px solid transparent; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #000; }</style><div class="own-colors"><button id="save">Save</button></div>`,
    );

    expect(await audit()).toEqual([]);
  });

  it("reports a box-shadow ring below 3:1", async () => {
    render(
      `<style>#save:focus-visible { outline: none; box-shadow: 0 0 0 2px #eee; }</style><div class="own-colors"><button id="save">Save</button></div>`,
    );

    expect(await audit({ level: "AA" })).toEqual([
      {
        rule: "focus",
        at: 'button#save "Save"',
        message:
          'button#save "Save" shows a focus ring of 1.16:1 against what is behind it (#eeeeee on #ffffff). A focus indicator needs 3:1 to be seen (WCAG 1.4.11). Darken the ring, and draw it with an outline: a box-shadow vanishes under forced colors.',
      },
    ]);
  });

  it("reports a focus style without an outline or ring at kit, which cannot measure it, and passes it at AA", async () => {
    render(
      `<style>#save { background: #fff; } #save:focus-visible { outline: none; background: #fefefe; }</style><div class="own-colors"><button id="save">Save</button></div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "focus",
        at: 'button#save "Save"',
        message:
          'button#save "Save" changes under keyboard focus, but with neither an outline nor a box-shadow ring, so audit cannot tell whether the change shows: a faint shift in background or color leaves keyboard users lost (WCAG 2.4.7, 1.4.11). Give :focus-visible an outline of 3:1.',
      },
    ]);
    expect(await audit({ level: "AA" })).toEqual([]);
  });

  it("reports a focus outline over a gradient as one it cannot measure", async () => {
    render(
      `<style>#save { background: #222; color: #fff; border: 1px solid #fff; }</style><div class="own-colors" id="backdrop" style="background: linear-gradient(#111, #1a1a1a); padding: 30px"><button id="save">Save</button></div>`,
    );

    expect(await audit({ level: "AA" })).toEqual([
      {
        rule: "unmeasured",
        at: 'button#save "Save"',
        message:
          'button#save "Save" cannot be measured: its focus outline lies over the background image or gradient of div#backdrop "Save", so audit cannot measure the backdrop (WCAG 1.4.11). Check that the focus outline reaches 3:1 against every part of the image, then exclude the element or drop this finding.',
      },
    ]);
  });

  // A ring that ::after draws 4px around the button: `focused` styles it under keyboard focus,
  // `rest` always.
  const ringAfter = (focused: string, rest = "") =>
    `<style>#save { position: relative; } #save:focus-visible { outline: none; } #save::after { position: absolute; inset: -4px; ${rest} } #save:focus-visible::after { content: ""; ${focused} }</style><div class="own-colors"><button id="save">Save</button></div>`;

  const faintOutline = (shown: string, ratio: string) => ({
    rule: "focus",
    at: 'button#save "Save"',
    message: `button#save "Save" shows a focus outline of ${ratio}:1 against what is behind it (${shown} on #ffffff). A focus indicator needs 3:1 to be seen (WCAG 1.4.11). Darken the outline, or offset it onto a surface it contrasts with.`,
  });

  it.each([
    { ring: "drawn on focus", focused: "outline: 2px solid #000", rest: "" },
    {
      ring: "revealed by opacity",
      focused: "opacity: 1",
      rest: 'content: ""; outline: 2px solid #000; opacity: 0',
    },
    {
      ring: "revealed by display",
      focused: "display: block",
      rest: 'content: ""; outline: 2px solid #000; display: none',
    },
    {
      ring: "faint at rest and strengthened by opacity",
      focused: "opacity: 1",
      rest: 'content: ""; outline: 2px solid #000; opacity: 0.2',
    },
  ])("passes a 2px outline of 3:1 that ::after draws, $ring", async ({ focused, rest }) => {
    render(ringAfter(focused, rest));

    expect(await audit()).toEqual([]);
  });

  it.each([
    {
      faint: "in its color",
      focused: "outline: 2px solid #eee",
      rest: "",
      found: ["#eeeeee", "1.16"],
    },
    {
      faint: "by the opacity that reveals it",
      focused: "opacity: 0.2",
      rest: 'content: ""; outline: 2px solid #000; opacity: 0',
      found: ["#cccccc", "1.6"],
    },
  ])(
    "reports an outline below 3:1 that ::after draws, faint $faint",
    async ({ focused, rest, found: [shown = "", ratio = ""] }) => {
      render(ringAfter(focused, rest));

      expect(await audit()).toEqual([faintOutline(shown, ratio)]);
    },
  );

  it.each(["display: none", "opacity: 0", "visibility: hidden", "transform: scale(0)"])(
    "reports a control whose ::after outline %s hides, which draws nothing",
    async (hidden) => {
      render(ringAfter(`outline: 2px solid #000; ${hidden}`));

      expect(await audit()).toEqual([unchanged]);
    },
  );

  it("reports at kit a focus change of background beside a hidden ::after outline, which is no ring", async () => {
    render(
      `<style>#save:focus-visible { background: #eee; }</style>${ringAfter("outline: 2px solid #000; display: none")}`,
    );

    expect(await audit()).toEqual([
      {
        rule: "focus",
        at: 'button#save "Save"',
        message:
          'button#save "Save" changes under keyboard focus, but with neither an outline nor a box-shadow ring, so audit cannot tell whether the change shows: a faint shift in background or color leaves keyboard users lost (WCAG 2.4.7, 1.4.11). Give :focus-visible an outline of 3:1.',
      },
    ]);
  });

  // A strong ring passes at kit, which asks for an outline only of a change it cannot measure.
  it.each([
    { color: "#000", level: "kit", found: [] },
    {
      color: "#eee",
      level: "AA",
      found: [
        {
          rule: "focus",
          at: 'button#save "Save"',
          message:
            'button#save "Save" shows a focus ring of 1.16:1 against what is behind it (#eeeeee on #ffffff). A focus indicator needs 3:1 to be seen (WCAG 1.4.11). Darken the ring, and draw it with an outline: a box-shadow vanishes under forced colors.',
        },
      ],
    },
  ] as const)(
    "measures a box-shadow ring of $color that ::after draws, at $level",
    async ({ color, level, found }) => {
      render(ringAfter(`box-shadow: 0 0 0 2px ${color}`));

      expect(await audit({ level })).toEqual(found);
    },
  );

  it("reports a control whose focus outline lies on a ::after without content, which draws nothing", async () => {
    render(
      `<style>#save:focus-visible { outline: none; } #save:focus-visible::after { outline: 2px solid #000; }</style><button id="save">Save</button>`,
    );

    expect(await audit()).toEqual([unchanged]);
  });

  it("reports a control that a fixed header covers once focused", async () => {
    render(
      `<header style="position: fixed; inset: 0 0 auto; height: 120px; background: #fff; z-index: 1">Header</header><button id="save" style="position: absolute; top: 40px">Save</button>`,
    );

    expect(await audit({ level: "AA" })).toEqual([
      {
        rule: "focus",
        at: 'button#save "Save"',
        message:
          'button#save "Save" is covered once it has keyboard focus and is scrolled into view: none of 9 points across it reaches it, so keyboard users cannot see where they are (WCAG 2.4.11). Give sticky headers and footers matching scroll-padding, or move what covers it.',
      },
    ]);
  });

  // As @foldkit/ui's Calendar does: the grid keeps focus, and the app marks the active day once it
  // hears the focus event, in its next frame.
  const grid = `<style>#days:focus-visible { outline: none; } [data-focused] { outline: 2px solid #000; }</style>
    <div role="grid" id="days" tabindex="0" aria-label="Days" aria-activedescendant="day-2">
      <div role="row"><div role="gridcell" id="day-1">1</div><div role="gridcell" id="day-2">2</div></div>
    </div>`;

  it("passes a widget whose app marks its active descendant once it hears focus", async () => {
    render(grid);
    const days = element("#days");
    const day = element("#day-2");

    days.addEventListener("focus", () => {
      requestAnimationFrame(() => day.setAttribute("data-focused", ""));
    });
    days.addEventListener("blur", () => {
      requestAnimationFrame(() => day.removeAttribute("data-focused"));
    });

    expect(await audit()).toEqual([]);
  });

  it("reports a widget whose active descendant shows no focus", async () => {
    render(grid);

    expect(await audit()).toEqual([
      {
        rule: "focus",
        at: 'div#days "Days"',
        message:
          'div#days "Days" looks the same under keyboard focus, so keyboard users lose their place (WCAG 2.4.7). Give :focus-visible an outline; a box-shadow vanishes under forced colors.',
      },
    ]);
  });
});

describe("target", () => {
  const isCoarse = matchMedia("(pointer: coarse)").matches;

  const sized = (px: number) =>
    `<style>#add { width: ${px}px; height: ${px}px; min-width: 0; min-height: 0; margin: 24px; padding: 0; border: 0; }</style>`;

  it("passes a 16px button with a 44px ::before hit area, and links in text", async () => {
    render(
      `${sized(16)}<style>#add { position: relative; } #add::before { content: ""; position: absolute; inset: -14px; }</style><button id="add">+</button><p>Read <a href="#terms">the terms</a> first.</p>`,
    );

    expect(await audit()).toEqual([]);
  });

  it.runIf(!isCoarse)("passes a 24px button under a fine pointer", async () => {
    render(`${sized(24)}<button id="add">+</button>`);

    expect(await audit()).toEqual([]);
  });

  it.runIf(!isCoarse)(
    "reports a 16px button under a fine pointer at kit and passes it at AA",
    async () => {
      render(`${sized(16)}<button id="add">+</button>`);

      expect(await audit()).toEqual([
        {
          rule: "target",
          at: 'button#add "+"',
          message:
            'button#add "+" takes the pointer at 1 of 9 points within 11px of its centre. Kit asks for 24px targets under a fine pointer, so people with tremors can hit them (WCAG 2.5.8). Make it 24px square, or give it a 24px ::before hit area.',
        },
      ]);
      expect(await audit({ level: "AA" })).toEqual([]);
    },
  );

  it.runIf(isCoarse)(
    "reports a 24px button under a coarse pointer at kit and passes it at AA",
    async () => {
      render(`${sized(24)}<button id="add">+</button>`);

      expect(await audit()).toEqual([
        {
          rule: "target",
          at: 'button#add "+"',
          message:
            'button#add "+" takes the pointer at 1 of 9 points within 21px of its centre. Kit asks for 44px targets under a coarse pointer, which a finger needs, so people with tremors can hit them (WCAG 2.5.5). Make it 44px square, or give it a 44px ::before hit area.',
        },
      ]);
      expect(await audit({ level: "AA" })).toEqual([]);
    },
  );

  it("passes links in a sentence that inline, inline-block and inline-flex boxes wrap", async () => {
    render(
      `<p>See <strong><a href="#a">A</a></strong>, <span style="display: inline-block"><a href="#b">B</a></span>, <span style="display: inline-flex"><a href="#c">C</a></span> and more.</p>`,
    );

    expect({ kit: await audit(), AA: await audit({ level: "AA" }) }).toEqual({ kit: [], AA: [] });
  });

  // The checkbox is 44px, so only the link could be reported.
  it("passes a link in a label's sentence", async () => {
    render(
      `<label><input type="checkbox" style="width: 44px; height: 44px; margin: 0"> I accept the <a href="#terms">terms</a></label>`,
    );

    expect({ kit: await audit(), AA: await audit({ level: "AA" }) }).toEqual({ kit: [], AA: [] });
  });

  it.each([
    { links: "a block of links alone", html: `<nav><a href="#a">A</a> <a href="#b">B</a></nav>` },
    {
      links: "a row of links under a heading",
      html: `<section><h2>Account</h2><a href="#a">A</a> <a href="#b">B</a></section>`,
    },
    {
      links: "a row of links beside a button",
      html: `<div><a href="#a">A</a> <a href="#b">B</a> <button>Save</button></div>`,
    },
  ])("checks links in $links", async ({ html }) => {
    render(html);

    expect((await audit({ level: "AA" })).map(({ rule, at }) => ({ rule, at }))).toEqual([
      { rule: "target", at: 'a "A"' },
      { rule: "target", at: 'a "B"' },
    ]);
  });

  // Buttons of these sizes in a row, `gap` apart.
  const row = (gap: number, first: number, second: number) =>
    `<div style="display: flex; align-items: center; gap: ${gap}px; margin: 24px">${[
      ["first", "First", first],
      ["second", "Second", second],
    ]
      .map(
        ([id, label, px]) =>
          `<button id="${id}" aria-label="${label}" style="width: ${px}px; height: ${px}px; min-width: 0; min-height: 0; padding: 0; border: 0"></button>`,
      )
      .join("")}</div>`;

  const crowded = (at: string, other: string, count = 1) => ({
    rule: "target",
    at,
    message: `${at} takes the pointer at ${count} of 9 points within 11px of its centre, and a 24px circle on its centre meets ${other}. WCAG 2.2 AA asks for 24px targets, or smaller ones spaced so that such a circle meets no other target, so people with tremors hit the one they mean (2.5.8). Make it 24px square, give it a 24px ::before hit area, or move it apart.`,
  });

  const [first, second] = ['button#first "First"', 'button#second "Second"'];

  // The circle meets the other button's box closer than 12px from its centre, or the other's own
  // circle when the other is undersized too, closer than 24px.
  it.each([
    {
      spacing: "a 20px button 1px from a 44px one",
      html: row(1, 20, 44),
      found: [crowded(first, second)],
    },
    { spacing: "a 20px button 2px from a 44px one", html: row(2, 20, 44), found: [] },
    {
      spacing: "16px buttons 6px apart",
      html: row(6, 16, 16),
      found: [crowded(first, second), crowded(second, first)],
    },
    { spacing: "16px buttons 8px apart", html: row(8, 16, 16), found: [] },
  ])("checks the spacing of $spacing at AA", async ({ html, found }) => {
    render(html);

    expect(await audit({ level: "AA" })).toEqual(found);
  });

  // A 16px dialog close button whose circle meets a 16px page button, 2px to its right.
  const tiny = (id: string, label: string, left: number) =>
    `<button id="${id}" aria-label="${label}" style="position: fixed; top: 0; left: ${left}px; width: 16px; height: 16px; min-width: 0; min-height: 0; padding: 0; border: 0"></button>`;

  it("passes at AA a dialog target whose circle meets only a page target behind its modal backdrop", async () => {
    render(
      `${tiny("row", "Row", 18)}<dialog id="confirm" aria-label="Confirm" style="margin: 0; padding: 0; border: 0">${tiny("close", "Close", 0)}</dialog>`,
    );
    const dialog = document.querySelector("dialog");
    dialog?.showModal();

    expect({
      isModal: dialog?.matches(":modal"),
      found: await audit({ root: "#confirm", level: "AA" }),
    }).toEqual({ isModal: true, found: [] });
  });

  it("passes at AA a target whose circle meets only an inert one", async () => {
    render(
      `<div inert>${tiny("row", "Row", 18)}</div><div role="dialog" id="confirm" aria-label="Confirm">${tiny("close", "Close", 0)}</div>`,
    );

    expect(await audit({ root: "#confirm", level: "AA" })).toEqual([]);
  });

  it("reports at AA a target whose circle meets that of a target outside the audit", async () => {
    render(row(12, 8, 8));

    expect({
      root: await audit({ root: "#first", level: "AA" }),
      exclude: await audit({ exclude: "#first", level: "AA" }),
    }).toEqual({ root: [crowded(first, second)], exclude: [crowded(second, first)] });
  });
});

describe("reflow", () => {
  it("passes wide content in an inline scroller", async () => {
    render(`<div style="overflow-x: auto"><div style="width: 2000px">Prices</div></div>`);

    expect(await audit()).toEqual([]);
  });

  it("reports the outermost box that makes the page scroll sideways", async () => {
    render(`<div id="prices" style="width: 2000px"><span>Prices</span></div>`);
    const width = document.documentElement.clientWidth;

    expect(await audit()).toEqual([
      {
        rule: "reflow",
        at: 'div#prices "Prices"',
        message: `div#prices "Prices" reaches ${2000 - width}px past the right edge of a ${width}px wide viewport, so the page scrolls sideways and people who zoom must scroll both ways to read (WCAG 1.4.10). Let it wrap or shrink, or put it in a container with overflow-x: auto.`,
      },
    ]);
  });
});

describe("reflow, fixed boxes", () => {
  it("passes a fixed box within the viewport, one wholly outside it, as a closed drawer, and one that scrolls what it holds", async () => {
    render(
      `<div role="dialog" aria-label="Confirm" style="position: fixed; top: 0; left: 0; width: 200px">Delete this file?</div><nav aria-label="Drawer" style="position: fixed; top: 0; left: -400px; width: 300px">Menu</nav><div style="position: fixed; inset: 0; overflow-x: auto"><div style="width: calc(100% + 80px)">Prices</div></div>`,
    );

    expect(await audit()).toEqual([]);
  });

  it("reports a fixed box that reaches past the viewport, which no scrolling reveals", async () => {
    render(
      `<div role="dialog" id="confirm" aria-label="Confirm" style="position: fixed; top: 0; right: -80px; width: 400px">Delete this file?</div>`,
    );
    const width = document.documentElement.clientWidth;

    expect(await audit()).toEqual([
      {
        rule: "reflow",
        at: 'div#confirm "Confirm"',
        message: `div#confirm "Confirm" reaches 80px past the right edge of a ${width}px wide viewport. It is fixed, so it does not scroll, and what lies past the edge cannot be reached at all (WCAG 1.4.10). Give it max-inline-size: 100% and let its content wrap.`,
      },
    ]);
  });

  it("reports what reaches past the viewport inside a fixed box that fits it", async () => {
    render(
      `<div id="overlay" style="position: fixed; inset: 0"><div id="panel" style="width: calc(100% + 80px)">Delete this file?</div></div>`,
    );
    const width = document.documentElement.clientWidth;

    expect(await audit()).toEqual([
      {
        rule: "reflow",
        at: 'div#panel "Delete this file?"',
        message: `div#panel "Delete this file?" reaches 80px past the right edge of a ${width}px wide viewport. It lies in div#overlay "Delete this file?", which is fixed, so it does not scroll, and what lies past the edge cannot be reached at all (WCAG 1.4.10). Give it max-inline-size: 100% and let its content wrap.`,
      },
    ]);
  });
});

describe("clipped", () => {
  it("passes text that fits, text hidden on purpose and boxes that escape a clip", async () => {
    render(`
      <div style="width: 200px; overflow: hidden">Fits</div>
      <span class="visually-hidden">Read by screen readers</span>
      <div style="height: 0; overflow: hidden">A collapsed panel</div>
      <div style="height: 20px; overflow: hidden"><span style="position: absolute">Positioned past the box</span></div>
    `);

    expect(await audit()).toEqual([]);
  });

  it("reports text that its own box cuts off", async () => {
    render(
      `<div id="name" style="width: 60px; overflow: hidden; white-space: nowrap">Katarzyna Wiśniewska</div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "clipped",
        at: 'div#name "Katarzyna Wiśniewska"',
        message:
          'div#name "Katarzyna Wiśniewska" is cut off by its own box, which hides its overflow, so part of the text cannot be read (WCAG 1.4.10). Let the box grow with its text, or let the text wrap.',
      },
    ]);
  });

  it("reports text that a box around it cuts off", async () => {
    render(
      `<div id="card" style="height: 30px; overflow: hidden"><p id="bio" style="margin: 0">One<br>Two<br>Three</p></div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "clipped",
        at: 'p#bio "One Two Three"',
        message:
          'p#bio "One Two Three" is cut off by div#card "One Two Three", which hides its overflow, so part of the text cannot be read (WCAG 1.4.10). Let the box grow with its text, or let the text wrap.',
      },
    ]);
  });

  it("reports text that ends in an ellipsis", async () => {
    render(
      `<div id="name" style="width: 60px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis">Katarzyna Wiśniewska</div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "clipped",
        at: 'div#name "Katarzyna Wiśniewska"',
        message:
          'div#name "Katarzyna Wiśniewska" ends in an ellipsis, so part of its text cannot be read (WCAG 1.4.10). Let the text wrap instead of truncating it.',
      },
    ]);
  });

  it("reports text that fits until WCAG 1.4.12's spacing applies, and removes the spacing", async () => {
    render(
      `<div id="badge" style="height: 20px; font-size: 20px; line-height: 20px; overflow: hidden">New</div>`,
    );

    expect(await audit()).toEqual([
      {
        rule: "clipped",
        at: 'div#badge "New"',
        message:
          'div#badge "New" is cut off by its own box once WCAG 1.4.12\'s text spacing applies (line height 1.5, letter spacing 0.12em, word spacing 0.16em), so people who widen the spacing lose text. Size the box with min-height and padding instead of a fixed height.',
      },
    ]);
    expect(getComputedStyle(element("#badge")).lineHeight).toBe("20px");
  });
});

describe("motion", () => {
  // A panel that scales into place, as a menu opens.
  const scaleIn = async () => {
    render(`<div id="panel" style="transition: scale 150ms; scale: 0.96">Panel</div>`);
    const panel = element("#panel");
    panel.getBoundingClientRect();
    panel.style.scale = "1";
  };

  it.runIf(reducedMotion)("reports movement under reduced motion", async () => {
    await scaleIn();

    expect(await audit()).toEqual([
      {
        rule: "motion",
        at: 'div#panel "Panel"',
        message:
          'div#panel "Panel" moved (scale 0.96 → 1, 150ms) under prefers-reduced-motion: reduce, which can make people sick (WCAG 2.3.3). Hold the value or use 0s under that query; opacity fades may stay.',
      },
    ]);
  });

  it.runIf(reducedMotion)("leaves movement alone at AA", async () => {
    await scaleIn();

    expect(await audit({ level: "AA" })).toEqual([]);
  });

  it.runIf(!reducedMotion)("leaves movement alone without reduced motion", async () => {
    await scaleIn();

    expect(await audit()).toEqual([]);
  });

  it.runIf(reducedMotion)(
    "reports a panel that grows by grid-template-rows, which Chromium reads as 0px at both ends",
    async () => {
      render(
        `<div id="panel" style="display: grid; grid-template-rows: 0fr; transition: grid-template-rows 200ms"><div style="overflow: hidden">Body</div></div>`,
      );
      const panel = element("#panel");
      panel.getBoundingClientRect();
      panel.style.gridTemplateRows = "1fr";

      expect(await audit()).toEqual([
        {
          rule: "motion",
          at: 'div#panel "Body"',
          message:
            'div#panel "Body" moved (grid-template-rows, 200ms) under prefers-reduced-motion: reduce, which can make people sick (WCAG 2.3.3). Hold the value or use 0s under that query; opacity fades may stay.',
        },
      ]);
    },
  );

  it.runIf(reducedMotion)(
    "passes the common reset to 0.01ms under reduced motion, which shows no movement",
    async () => {
      // The delays keep both listed when their events arrive, so audit sees their durations.
      render(`<style>
        @keyframes slide { from { translate: -40px; } to { translate: none; } }
        @media (prefers-reduced-motion: reduce) {
          .reset { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
        }
      </style><div id="panel" class="reset" style="transition: scale 150ms 100ms; scale: 0.96">Panel</div><div class="reset" style="animation: slide 300ms 100ms">Toast</div>`);
      const panel = element("#panel");
      panel.getBoundingClientRect();
      panel.style.scale = "1";
      await afterFrames(2);

      expect(await audit()).toEqual([]);
    },
  );

  it.runIf(reducedMotion)(
    "keeps what moved outside one audit's root for the audit of that root",
    async () => {
      render(
        `<div id="first"><div id="one" style="transition: scale 150ms; scale: 0.96">One</div></div><div id="second"><div id="two" style="transition: scale 150ms; scale: 0.96">Two</div></div>`,
      );
      const [one, two] = [element("#one"), element("#two")];
      one.getBoundingClientRect();
      one.style.scale = "1";
      two.style.scale = "1";

      expect((await audit({ root: "#first" })).map(({ at }) => at)).toEqual(['div#one "One"']);
      expect((await audit({ root: "#second" })).map(({ at }) => at)).toEqual(['div#two "Two"']);
      expect(await audit({ root: "#first" })).toEqual([]);
    },
  );

  it.runIf(reducedMotion)(
    "passes an animation whose keyframes hold a moving property at one value",
    async () => {
      render(`<style>
        @keyframes appear { from { opacity: 0; translate: 0 4px; } to { opacity: 1; translate: 0 4px; } }
      </style><div style="animation: appear 150ms">Toast</div>`);

      expect(await audit()).toEqual([]);
    },
  );

  it("passes fades and transitions between equal values", async () => {
    render(
      `<div id="panel" style="transition: opacity 150ms, scale 150ms; opacity: 0; scale: 1">Panel</div>`,
    );
    const panel = element("#panel");
    panel.getBoundingClientRect();
    panel.style.opacity = "1";
    panel.style.scale = "1";

    expect(await audit()).toEqual([]);
  });
});

describe.runIf(forcedColors)("state", () => {
  const tabs = (selected: string) =>
    `<style>[role="tab"] { border: 0; background: #fff; color: #000; } [aria-selected="true"] { ${selected} }</style>
    <div role="tablist"><button role="tab" id="overview" aria-selected="false">Overview</button><button role="tab" id="notes" aria-selected="true">Notes</button></div>`;

  it("passes a state drawn with a border, which forced colors keep", async () => {
    render(tabs("border-bottom: 3px solid;"));

    expect(await audit()).toEqual([]);
  });

  // Options whose tick a dash of the path's whole length draws, offset by `selected` on the
  // selected one and by its length on the other.
  const ticks = (selected: string) =>
    `<style>[role="option"] path { stroke-dasharray: 1; stroke-dashoffset: 1; } [aria-selected="true"] path { stroke-dashoffset: ${selected}; }</style>
    <div role="listbox" aria-label="Language">${[
      ["polski", "Polski", "false"],
      ["deutsch", "Deutsch", "true"],
    ]
      .map(
        ([id, label, isSelected]) =>
          `<div role="option" id="${id}" aria-selected="${isSelected}">${label}<svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 8 6 12 14 4" pathLength="1" stroke="currentColor" fill="none" stroke-width="2"/></svg></div>`,
      )
      .join("")}</div>`;

  it("passes a selected option whose tick its dash offset shows", async () => {
    render(ticks("0"));

    expect(await audit()).toEqual([]);
  });

  it("reports a selected option whose tick a dash offset the other way still hides", async () => {
    render(ticks("-1"));

    expect((await audit()).map(({ rule, at }) => ({ rule, at }))).toEqual([
      { rule: "state", at: 'div#deutsch "Deutsch"' },
    ]);
  });

  it("reports a state drawn in colors alone", async () => {
    render(tabs("background: #000; color: #fff;"));

    expect(await audit()).toEqual([
      {
        rule: "state",
        at: 'button#notes "Notes"',
        message:
          'button#notes "Notes" (aria-selected="true") paints the same as button#overview "Overview" under forced colors, so its state disappears when the system replaces colors (WCAG 1.4.1, 1.4.11). Draw the state in a system color, such as Highlight, or with a border or mark.',
      },
    ]);
  });
});

describe("settling", () => {
  const faint = `<div class="own-colors"><button role="checkbox" aria-checked="false" id="terms" aria-label="Terms" style="border: 2px solid #c8c8c8"></button></div>`;

  it("waits until no element carries data-transition", async () => {
    render(`<div id="panel" data-transition>${faint}</div>`);

    void afterFrames(10).then(() => {
      element("#terms").style.borderColor = "#000";
      element("#panel").removeAttribute("data-transition");
    });

    expect(await audit()).toEqual([]);
  });

  it("waits for finite animations and not for infinite ones", async () => {
    render(`<style>
      @keyframes darken { from { border-color: #c8c8c8; } to { border-color: #000; } }
      @keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }
    </style>${faint}<div style="animation: pulse 1s infinite">Loading</div>`);
    element("#terms").style.animation = "darken 300ms forwards";

    expect(await audit()).toEqual([]);
  });

  it(
    "throws when an element still carries data-transition after 5s",
    { timeout: 10_000 },
    async () => {
      render(`<div id="panel" data-transition>Panel</div>`);

      await expect(audit()).rejects.toThrow(
        'div#panel "Panel" still carried data-transition after 5s, so audit cannot measure the page at rest. Let finite animations and @foldkit/ui transitions end, or exclude the element.',
      );
    },
  );
});

describe("scope", () => {
  const faint = (id: string) =>
    `<div class="own-colors"><button role="checkbox" aria-checked="false" id="${id}" aria-label="${id}" style="border: 2px solid #c8c8c8; background: #fff"></button></div>`;

  it("checks root and the panels its controls name, wherever they are", async () => {
    render(
      `<div id="app"><button aria-controls="menu" aria-expanded="true">Menu</button></div><div id="menu">${faint("inside")}</div>${faint("outside")}`,
    );

    expect((await audit({ root: "#app" })).map(({ at }) => at)).toEqual(['button#inside "inside"']);
  });

  it("skips excluded subtrees, which still cover what lies under them", async () => {
    render(
      `<div id="payment" data-transition style="position: fixed; inset: 0 0 auto; height: 120px; background: #fff; z-index: 1">${faint("card")}</div><button id="save" style="position: absolute; top: 40px">Save</button>`,
    );

    expect(await audit({ exclude: "#payment", level: "AA" })).toEqual([
      expect.objectContaining({ rule: "focus", at: 'button#save "Save"' }),
    ]);
  });

  it("throws when root matches nothing", async () => {
    await expect(audit({ root: "#missing" })).rejects.toThrow(
      'No element matches the root "#missing". Pass the selector of an element on the page, or leave root out to check the whole body.',
    );
  });
});

describe("what audit leaves behind", () => {
  it("keeps focus events from the page and restores focus, scroll and stylesheets", async () => {
    render(`
      <input id="name" aria-label="Name" style="height: 44px; border: 1px solid #767676">
      <div id="scroller" style="height: 100px; overflow: auto"><div style="height: 1000px"></div><button>Far</button></div>
      <div style="height: 3000px"></div>
    `);
    const scroller = element("#scroller");
    await page.getByRole("textbox", { name: "Name" }).click();
    scroller.scrollTop = 120;
    window.scrollTo({ top: 200, behavior: "instant" });
    const sheets = [...document.adoptedStyleSheets];
    const heard: Array<string> = [];

    for (const type of ["focus", "blur", "focusin", "focusout"]) {
      document.addEventListener(type, () => heard.push(type), true);
    }

    expect(await audit()).toEqual([]);
    expect({
      heard,
      focused: document.activeElement?.id,
      scrollerTop: scroller.scrollTop,
      pageTop: scrollY,
      sheets: document.adoptedStyleSheets,
    }).toEqual({ heard: [], focused: "name", scrollerTop: 120, pageTop: 200, sheets });
  });
});
