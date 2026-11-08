/**
 * Class name inputs this package fills from a part's styles, mapped to that part. Setting one
 * fails with a message naming the part.
 */
export type FilledFromStyles<Inputs extends Readonly<Record<string, string>>> = Readonly<{
  [
    Input in keyof Inputs
  ]?: `Style the ${Inputs[Input]} part through styles; this package sets ${Input & string}.`;
}>;

/** The same inputs as @foldkit/ui types them, for a module's `Reads`. */
export type ClassNames<Filled> = Readonly<{ [Input in keyof Filled]?: string }>;
