import { Context, Effect, Layer, Schema } from "effect";

import { Decision, Permission, PermissionFilter } from "../src/index.ts";

export interface Caller {
  readonly id: string;
}

/** @effect-leakable-service */
export class CurrentCaller extends Context.Service<CurrentCaller, Caller>()("test/CurrentCaller") {}

export const as = (id: string) => Effect.provideService(CurrentCaller, { id });

export const Note = Schema.Struct({
  id: Schema.String,
  authorId: Schema.String,
  hidden: Schema.Boolean,
});

export class ViewNote extends Permission.Service<ViewNote>()("test/ViewNote", {
  id: "notes.view",
  target: Note,
}) {}

export class EditNote extends Permission.Service<EditNote, { requires: CurrentCaller }>()(
  "test/EditNote",
  { id: "notes.edit", target: Note, error: ViewNote.Denied },
) {}

export class Publish extends Permission.Service<Publish, { requires: CurrentCaller }>()(
  "test/Publish",
  {},
) {}

export const ViewNoteLayer = ViewNote.toLayer((note) =>
  note.hidden ? Decision.deny("Hidden") : Decision.allow(),
);

export class ViewNoteFilter extends PermissionFilter.Service<ViewNoteFilter>()(ViewNote) {}

export const ViewNoteFilterLayer = ViewNoteFilter.toLayer((where) => where.eq("hidden", false));

export const EditNoteLayer = EditNote.toLayer(
  Effect.gen(function* () {
    const view = yield* ViewNote;

    return Effect.fn(function* (note) {
      yield* view.require(note);

      const caller = yield* CurrentCaller;

      return note.authorId === caller.id ? Decision.allow() : Decision.deny("Authors only");
    });
  }),
).pipe(Layer.provide(ViewNoteLayer));

export const PublishLayer = Publish.toLayer(() => Decision.allow());

export const live = Layer.mergeAll(ViewNoteLayer, ViewNoteFilterLayer, EditNoteLayer, PublishLayer);

export const note = Note.make({ id: "n1", authorId: "ada", hidden: false });
