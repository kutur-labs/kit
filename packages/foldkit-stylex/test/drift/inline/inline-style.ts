// Each test renders its component's parts in Scene and checks that the properties @foldkit/ui
// writes inline on each part, when its view renders, equal the ones the test lists. `owns` fails
// the type check where the part's family in `Owns`, in src/internal/owned.ts, does not say
// @foldkit/ui writes one of them, so the part's styles cannot set a property an inline style
// overrides. test/owned.test.ts checks that each family also lists every property that sets the
// same longhands. Scene runs no Mount, so what Floating UI writes on an open anchored panel is
// checked in the gallery's browser tests instead.
import { Option } from "effect";
import * as Scene from "foldkit/scene";

type Properties = Set<string>;

/**
 * A step adding the inline properties of the element `selector` finds, camel-cased as StyleX names
 * them. Custom properties carry values to the app's styles, so no part owns them.
 */
export const inline = (selector: string, into: Properties) =>
  Scene.tap((simulation) => {
    const element = Option.getOrThrow(Scene.find(simulation.html, selector));

    for (const property of Object.keys(element.data?.style ?? {})) {
      if (!property.startsWith("--")) {
        into.add(
          property.replace(/-([a-z])/g, (_dash: string, letter: string) => letter.toUpperCase()),
        );
      }
    }
  });

export const sorted = (properties: Iterable<string>) => [...properties].sort();

// Prefixed properties @foldkit/ui writes inline that StyleX does not type, so no app's class sets
// them, each as the property that sets the same longhand.
type Unprefixed = { WebkitUserSelect: "userSelect" };

type Named<Property> = Property extends keyof Unprefixed ? Unprefixed[Property] : Property;

// The properties whose message in `Family` says @foldkit/ui writes them inline.
type Written<Family> = {
  [
    Property in keyof Family & string
  ]: Family[Property] extends `@foldkit/ui sets ${Property} inline on this part.${string}`
    ? Property
    : never;
}[keyof Family & string];

// Matches only a property the family says @foldkit/ui writes, so the error names the fix.
type Checked<Family, Property> =
  Named<Property> extends Written<Family>
    ? Property
    : Readonly<{
        [
          Message in `Add ${Named<Property> & string} to the properties @foldkit/ui writes in the part's family in src/internal/owned.ts, and map the part to that family in Owns. A prefixed name StyleX does not type goes in Unprefixed instead.`
        ]: never;
      }>;

/**
 * `properties`, the ones @foldkit/ui writes inline on a part whose family is `Family`. Fails the
 * type check for a property `Family` does not say @foldkit/ui writes.
 */
export const owns =
  <Family>() =>
  <const List extends ReadonlyArray<string>>(
    ...properties: List & NoInfer<{ readonly [Index in keyof List]: Checked<Family, List[Index]> }>
  ): List =>
    properties;
