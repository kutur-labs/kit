import { Decision, Permission } from "@kutur-kit/access";
import * as PermissionAudit from "@kutur-kit/access/audit";
import { Audit, AuditKey } from "@kutur-kit/audit";
import { TestAuditLog } from "@kutur-kit/audit/testing";
import { Context, Effect, Layer, Schema } from "effect";

class CurrentUser extends Context.Service<CurrentUser, { readonly id: string }>()(
  "demo/CurrentUser",
) {}

const Note = Schema.Struct({
  id: Schema.String.pipe(AuditKey.key),
  ownerId: Schema.String,
  body: Schema.String,
});

// EditNote's methods require CurrentUser from every caller on purpose: the policy reads the
// caller of each request. The directive stops the Effect language service reporting it as leaking.
/** @effect-expect-leaking CurrentUser */
class EditNote extends Permission.Service<EditNote, { requires: CurrentUser }>()("demo/EditNote", {
  id: "notes.edit",
  target: Note,
}) {}

const policy = EditNote.toLayer(
  Effect.fn(function* (note) {
    const user = yield* CurrentUser;

    return user.id === note.ownerId ? Decision.allow() : Decision.deny("Only the owner can edit");
  }),
).pipe(PermissionAudit.record(EditNote), Layer.provideMerge(TestAuditLog.layer));

export interface PermissionInput {
  readonly userId: "ada" | "bo";
  readonly mode: "check" | "require";
  readonly restricted: boolean;
}

export const permissionDemo = (input: PermissionInput) =>
  Effect.gen(function* () {
    const note = { id: "note-1", ownerId: "ada", body: "Original note" };

    const action =
      input.mode === "check"
        ? EditNote.check(note).pipe(Effect.map((decision) => decision._tag))
        : EditNote.require(note).pipe(
            Effect.andThen(
              Effect.sync(() => {
                note.body = "Updated note";
              }),
            ),
            Effect.as("Saved"),
            Effect.catchTag("AccessDenied", () => Effect.succeed("AccessDenied")),
          );

    const result = yield* action.pipe(Permission.restrictTo(input.restricted ? [] : [EditNote]));

    const entries = yield* TestAuditLog.entries;

    return {
      result,
      body: note.body,
      audit: entries.map(({ action, outcome, target, actor, details, reason }) => ({
        action,
        outcome,
        target,
        actor,
        details,
        reason,
      })),
    };
  }).pipe(
    Audit.withActor({ id: input.userId, kind: "user" }),
    Effect.provideService(CurrentUser, { id: input.userId }),
    Effect.provide(policy),
  );
