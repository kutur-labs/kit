import { Condition } from "@kutur-kit/access";
import { Effect, ManagedRuntime } from "effect";
import { afterAll, test } from "vitest";

import { Documents } from "./documents.ts";
import { app, asUser, documents, withRole } from "./fixture.ts";
import {
  DeleteDocument,
  DeleteDocumentFilter,
  EditDocument,
  EditDocumentFilter,
  ViewDocument,
  ViewDocumentFilter,
} from "./permissions.ts";

// What permissions cost one member against PostgreSQL: each check looks up
// the member's memberships and shares; listing builds a condition once.

const runtime = ManagedRuntime.make(app);

afterAll(() => runtime.dispose());

const member = withRole("member");

const as = <A, E, R>(effect: Effect.Effect<A, E, R>) => effect.pipe(asUser(member));

const document = documents.find(({ visibility }) => visibility === "team") ?? documents[0];

test("deciding one document", async ({ bench }) => {
  if (document === undefined) throw new Error("The seed has documents");

  await bench.compare(
    bench("view check", () => runtime.runPromise(as(ViewDocument.check(document)))),
    bench("edit check, requiring view", () => runtime.runPromise(as(EditDocument.check(document)))),
    bench("delete check, requiring edit and view", () =>
      runtime.runPromise(as(DeleteDocument.check(document)))),
  );
});

test("listing", async ({ bench }) => {
  await bench.compare(
    bench("view condition", () => runtime.runPromise(as(ViewDocumentFilter.condition))),
    bench("edit condition, on the view condition", () =>
      runtime.runPromise(as(EditDocumentFilter.condition))),
    bench("delete condition, on the edit condition", () =>
      runtime.runPromise(as(DeleteDocumentFilter.condition))),
    bench("one page of 100 visible documents", () =>
      runtime.runPromise(
        as(Effect.flatMap(Documents, (store) => store.visible({ limit: 100, offset: 0 }))),
      )),
  );
});

test(`deciding all ${documents.length} documents`, async ({ bench }) => {
  await bench.compare(
    bench("checking each document", () =>
      runtime.runPromise(
        as(Effect.forEach(documents, (each) => ViewDocument.check(each), { discard: true })),
      )),
    bench("one filtered query", () =>
      runtime.runPromise(
        as(Effect.flatMap(Documents, (store) => store.visible({ limit: 10_000, offset: 0 }))),
      )),
    bench("the condition, matched in memory", () =>
      runtime.runPromise(
        as(
          Effect.map(ViewDocumentFilter.condition, (condition) =>
            documents.filter((each) => Condition.matches(condition, each)),
          ),
        ),
      )),
    { iterations: 5 },
  );
});
