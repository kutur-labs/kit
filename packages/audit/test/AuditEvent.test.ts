import { it } from "@effect/vitest";
import { Cause, Crypto, DateTime, Effect, Exit, Layer, Option, Redacted, Schema } from "effect";
import { expect, it as test } from "vitest";

import * as Audit from "../src/Audit.ts";
import * as AuditEvent from "../src/AuditEvent.ts";
import * as AuditKey from "../src/AuditKey.ts";
import { TestAuditLog } from "../src/testing/index.ts";

const Item = Schema.Struct({
  id: Schema.String.pipe(AuditKey.key),
  ownerId: Schema.String.pipe(AuditKey.key),
  body: Schema.String,
});

const item = Item.make({ id: "i1", ownerId: "ada", body: "Private" });

const ViewItem = AuditEvent.make("items.view", { target: Item });

const targets = Effect.map(TestAuditLog.entries, (entries) => entries.map((entry) => entry.target));

it.effect("records events with their time, actor and the caller's trace", () =>
  Effect.gen(function* () {
    const SignIn = AuditEvent.make("session.sign-in", {});
    const agent = { id: "token-1", kind: "agent", onBehalfOf: "ada" };

    const span = yield* Effect.currentSpan.pipe(
      Effect.tap(() => SignIn.log().pipe(Audit.withActor(agent))),
      Effect.withSpan("handler"),
    );

    yield* SignIn.log();

    const [signedIn, anonymous] = yield* TestAuditLog.entries;

    expect(signedIn).toMatchObject({
      action: "session.sign-in",
      outcome: "success",
      actor: agent,
      traceId: span.traceId,
      spanId: span.spanId,
    });
    expect(signedIn?.at).toEqual(DateTime.makeUnsafe(0));
    expect(anonymous).not.toHaveProperty("actor");
    expect(anonymous).not.toHaveProperty("traceId");
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("records the chosen outcome, the reason and details encoded as JSON", () =>
  Effect.gen(function* () {
    const Approve = AuditEvent.make("payouts.approve", {
      outcomes: ["Approved", "Refused"],
      details: Schema.Struct({ amount: Schema.Int, due: Schema.DateTimeUtc }),
    });

    yield* Approve.log({
      outcome: "Refused",
      reason: "Over approval limit",
      details: { amount: 50_000, due: DateTime.makeUnsafe("2026-02-01T00:00:00Z") },
    });

    expect(yield* TestAuditLog.entries).toMatchObject([
      {
        outcome: "Refused",
        reason: "Over approval limit",
        details: { amount: 50_000, due: "2026-02-01T00:00:00.000Z" },
      },
    ]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("records no details when an event's optional details are undefined", () =>
  Effect.gen(function* () {
    const Refuse = AuditEvent.make("access.refuse", {
      details: Schema.UndefinedOr(Schema.Struct({ by: Schema.String })),
    });

    yield* Refuse.log({ details: undefined });
    yield* Refuse.log({ details: { by: "policy" } });

    const [none, some] = yield* TestAuditLog.entries;

    expect(none).not.toHaveProperty("details");
    expect(some?.details).toEqual({ by: "policy" });
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("gives entries distinct UUIDv7 ids, from the app's Crypto when it provides one", () =>
  Effect.gen(function* () {
    // @effect-diagnostics-next-line unstableApiUsage:off
    const zeros = Crypto.make({
      randomBytes: (size) => new Uint8Array(size),
      digest: (_, data) => Effect.succeed(data),
    });

    yield* ViewItem.log({ target: item });
    yield* ViewItem.log({ target: item });
    // @effect-diagnostics-next-line unstableApiUsage:off
    yield* ViewItem.log({ target: item }).pipe(Effect.provideService(Crypto.Crypto, zeros));

    const [first, second, provided] = yield* TestAuditLog.entries;

    expect(first?.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    expect(second?.id).not.toBe(first?.id);
    expect(provided?.id).toBe("00000000-0000-7000-8000-000000000000");
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("asks for isolated writes only for events that declare them", () =>
  Effect.gen(function* () {
    const writes: Array<Audit.RecordOptions> = [];

    const spy = Layer.succeed(Audit.AuditLog, {
      record: (_, options) =>
        Effect.sync(() => {
          writes.push(options);
        }),
    });

    const Refused = AuditEvent.make("access.refused", { isolated: true });
    const Approved = AuditEvent.make("invoice.approved", {});

    yield* Effect.all([Refused.log(), Approved.log()]).pipe(Effect.provide(spy));

    expect(writes).toEqual([{ isolated: true }, { isolated: false }]);
  }),
);

it.effect("fails with the audit log's defect, so unrecorded actions never complete", () =>
  Effect.gen(function* () {
    const failing = Layer.succeed(Audit.AuditLog, {
      record: () => Effect.die("Audit store unavailable"),
    });

    const exit = yield* ViewItem.log({ target: item }).pipe(Effect.provide(failing), Effect.exit);

    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBe("Audit store unavailable");
  }),
);

it.effect("records only the marked fields of the target by default", () =>
  Effect.gen(function* () {
    yield* ViewItem.log({ target: item });

    expect(yield* targets).toEqual([{ id: "i1", ownerId: "ada" }]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("records the target through an explicit view, or not at all", () =>
  Effect.gen(function* () {
    const Rename = AuditEvent.make("items.rename", {
      target: Schema.Struct({ item: Item, title: Schema.String }),
      view: Schema.Struct({ title: Schema.String }),
    });

    const Open = AuditEvent.make("items.open", { target: Item, view: false });

    yield* Rename.log({ target: { item, title: "Draft" } });
    yield* Open.log({ target: item });

    const [renamed, opened] = yield* TestAuditLog.entries;

    expect(renamed?.target).toEqual({ title: "Draft" });
    expect(opened).not.toHaveProperty("target");
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("never records Redacted fields, even when marked", () =>
  Effect.gen(function* () {
    const UseToken = AuditEvent.make("tokens.use", {
      target: Schema.Struct({
        id: Schema.String.pipe(AuditKey.key),
        secret: Schema.Redacted(Schema.String).pipe(AuditKey.key),
      }),
    });

    yield* UseToken.log({ target: { id: "t1", secret: Redacted.make("hunter2") } });

    expect(yield* targets).toEqual([{ id: "t1" }]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("derives views through classes, optional fields, arrays and unions", () =>
  Effect.gen(function* () {
    class Member extends Schema.Class<Member>("test/Member")({
      id: Schema.String.pipe(AuditKey.key),
      email: Schema.String,
    }) {}

    const Folder = Schema.TaggedStruct("Folder", { id: Schema.String.pipe(AuditKey.key) });
    const File = Schema.TaggedStruct("File", { path: Schema.String.pipe(AuditKey.key) });

    const Invite = AuditEvent.make("members.invite", {
      target: Schema.Struct({
        member: Member,
        team: Schema.optional(Schema.String.pipe(AuditKey.key)),
        items: Schema.Array(Item),
        shared: Schema.Union([Folder, File]),
        note: Schema.optional(Schema.String),
      }),
    });

    yield* Invite.log({
      target: {
        member: new Member({ id: "m1", email: "m1@example.com" }),
        team: "t1",
        items: [item],
        shared: File.make({ path: "/plans" }),
        note: "Welcome",
      },
    });

    yield* Invite.log({
      target: {
        member: new Member({ id: "m2", email: "m2@example.com" }),
        team: undefined,
        items: [],
        shared: Folder.make({ id: "f1" }),
      },
    });

    expect(yield* targets).toEqual([
      {
        member: { id: "m1" },
        team: "t1",
        items: [{ id: "i1", ownerId: "ada" }],
        shared: { path: "/plans" },
      },
      { member: { id: "m2" }, team: null, items: [], shared: { id: "f1" } },
    ]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("records no target when nothing in it is marked", () =>
  Effect.gen(function* () {
    const Schedule = AuditEvent.make("meetings.schedule", {
      target: Schema.Struct({
        at: Schema.DateTimeUtc,
        retry: Schema.Option(Schema.String),
        pair: Schema.Tuple([Schema.String.pipe(AuditKey.key), Schema.String]),
        title: Schema.String,
      }),
    });

    yield* Schedule.log({
      target: {
        at: DateTime.makeUnsafe("2026-10-16T00:00:00Z"),
        retry: Option.some("hourly"),
        pair: ["a", "b"],
        title: "Standup",
      },
    });

    const [entry] = yield* TestAuditLog.entries;

    expect(entry).toMatchObject({ action: "meetings.schedule" });
    expect(entry).not.toHaveProperty("target");
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

it.effect("dies when the target fails its view, recording nothing", () =>
  Effect.gen(function* () {
    const Tag = AuditEvent.make("items.tag", {
      target: Schema.Struct({ name: Schema.NonEmptyString.pipe(AuditKey.key) }),
    });

    const exit = yield* Tag.log({ target: { name: "" } }).pipe(Effect.exit);

    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
    expect(yield* TestAuditLog.entries).toEqual([]);
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

test("rejects views and details containing Redacted fields anywhere", () => {
  const secret = Schema.Redacted(Schema.String);

  class Token extends Schema.Class<Token>("test/Token")({ id: Schema.String, secret }) {}

  const schemas = [
    Schema.Struct({ id: Schema.String, secret }),
    Schema.Struct({ id: Schema.String, token: Token }),
    Schema.Struct({ pair: Schema.Tuple([Schema.String, secret]) }),
    Schema.Struct({ secret: Schema.Union([Schema.Finite, secret]) }),
  ];

  for (const schema of schemas) {
    expect(() => AuditEvent.make("tokens.use", { target: schema, view: schema })).toThrow(
      "The view of audit event tokens.use contains a Redacted field",
    );
    expect(() => AuditEvent.make("tokens.use", { details: schema })).toThrow(
      "The details of audit event tokens.use contains a Redacted field",
    );
  }
});

test("accepts explicit views with classes and other declarations", () => {
  class Member extends Schema.Class<Member>("test/Member")({ id: Schema.String }) {}

  const view = Schema.Struct({ member: Member, at: Schema.DateTimeUtc });

  expect(() => AuditEvent.make("members.join", { target: view, view })).not.toThrow();
});

const secrets = Schema.Struct({
  secrets: Schema.Record(Schema.String, Schema.Redacted(Schema.String)),
});

test("rejects views and details with Redacted values inside Records", () => {
  expect(() => AuditEvent.make("keys.rotate", { target: secrets, view: secrets })).toThrow(
    "The view of audit event keys.rotate contains a Redacted field",
  );
  expect(() => AuditEvent.make("keys.rotate", { details: secrets })).toThrow(
    "The details of audit event keys.rotate contains a Redacted field",
  );
});

interface Folder {
  readonly key: Redacted.Redacted<string>;
  readonly folders: ReadonlyArray<Folder>;
}

// SAFETY: the annotation gives the recursive schema its type.
const Folder: Schema.Codec<Folder> = Schema.Struct({
  key: Schema.Redacted(Schema.String),
  folders: Schema.Array(Schema.suspend((): Schema.Codec<Folder> => Folder)),
}) as Schema.Codec<Folder>;

const shared = Schema.Struct({ root: Schema.suspend(() => Folder) });

it.effect("dies rather than record Redacted values the definition check cannot see", () =>
  Effect.gen(function* () {
    const Share = AuditEvent.make("folders.share", { target: shared, view: shared });

    const Note = AuditEvent.make("notes.write", {
      details: Schema.Struct({ body: Schema.Unknown }),
    });

    const exits = yield* Effect.forEach(
      [
        Share.log({ target: { root: { key: Redacted.make("hunter2"), folders: [] } } }),
        Note.log({ details: { body: { token: Redacted.make("hunter2") } } }),
      ],
      Effect.exit,
    );

    expect(exits.map((exit) => Exit.isFailure(exit) && Cause.hasDies(exit.cause))).toEqual([
      true,
      true,
    ]);
    expect(JSON.stringify(yield* TestAuditLog.entries)).not.toContain("hunter2");
  }).pipe(Effect.provide(TestAuditLog.layer)),
);

// Not supported yet. Each test below states the behaviour we want and fails
// today; `fails` passes while it does, and fails once the behaviour exists.

// The definition check does not follow Schema.suspend, so such views are only
// stopped when logging a Redacted value, as tested above.
test.fails("rejects views with Redacted fields inside recursive schemas", () => {
  expect(() => AuditEvent.make("folders.share", { target: shared, view: shared })).toThrow(
    "The view of audit event folders.share contains a Redacted field",
  );
});
