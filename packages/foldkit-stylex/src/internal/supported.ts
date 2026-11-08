// "Section.key" for each key this package reads that the installed @foldkit/ui lacks, or whose
// type no longer fits how this package reads it.
type Missing<Has, Reads> = {
  [Section in keyof Reads & string]: {
    [Key in keyof Reads[Section] & string]-?: Section extends keyof Has
      ? Key extends keyof Has[Section]
        ? Has[Section][Key] extends Reads[Section][Key]
          ? never
          : `${Section}.${Key}`
        : `${Section}.${Key}`
      : `${Section}.${Key}`;
  }[keyof Reads[Section] & string];
}[keyof Reads & string];

/**
 * `View` while the installed @foldkit/ui still has everything this package reads from it (`Has`
 * names its types, `Reads` what this package needs of them), otherwise a message. Open peer ranges
 * let an app install a @foldkit/ui this release has not seen; a renamed part or state field then
 * fails at the call site instead of styling the wrong state. A callback this package passes, such
 * as `toView`, takes `never` in `Reads`: that checks the input still takes it with no more
 * parameters, and another section checks what it gets. It returns `void`, which takes any return
 * type, because this package hands the result to @foldkit/ui unread.
 */
export type Supported<Component extends string, Has, Reads, View> = [Missing<Has, Reads>] extends [
  never,
]
  ? View
  : `This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: ${Component} changed ${Missing<Has, Reads>}. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it.`;
