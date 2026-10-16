import { it } from "@effect/vitest";
import { Decision } from "@kutur-kit/access";
import { OperationHttp } from "@yielded/auth";
import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Redacted, Ref } from "effect";
import { Cookies, HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { expect } from "vitest";

import { users } from "./accounts.ts";
import { Api, CrossSiteRequest, SessionHttp, TokenNotFound, Unauthenticated } from "./api.ts";
import { collector, outsider } from "./data.ts";
import { auditEntries, Database } from "./database.ts";
import { Documents } from "./documents.ts";
import { DirectoryUnavailable, DocumentNotFound } from "./domain.ts";
import {
  agent,
  app,
  asUser,
  browser,
  documents,
  emailOf,
  passwordOf,
  provision,
  server,
  signedIn,
  withRole,
} from "./fixture.ts";
import { origin } from "./server.ts";

// Authentication evidence is checked against the database's clock, so these
// tests run on the live clock.
const api = server.pipe(Layer.provideMerge(app));

const everything = { limit: 10_000, offset: 0 };

const member = withRole("member");

/** What the user can do with each document, decided without HTTP. */
const access = (user: string) =>
  Effect.gen(function* () {
    const store = yield* Documents;
    const visible = yield* store.visible(everything).pipe(asUser(user));
    const editable = new Set(yield* store.editable(everything).pipe(asUser(user)));

    // The seed has documents of each kind for the users these tests pick.
    const pick = (predicate: (id: string) => boolean) =>
      Effect.orDie(Effect.fromNullishOr(documents.find(({ id }) => predicate(id))));

    return {
      visible,
      hidden: yield* pick((id) => !visible.includes(id)),
      readOnly: yield* pick((id) => visible.includes(id) && !editable.has(id)),
      editable: yield* pick((id) => editable.has(id)),
    };
  });

const recorded = Effect.gen(function* () {
  const database = yield* Database;

  return yield* database
    .select()
    .from(auditEntries)
    .orderBy(auditEntries.at, auditEntries.id)
    .pipe(Effect.orDie);
});

it.live(
  "pages each user's documents by cursor exactly as their permissions select",
  () =>
    Effect.gen(function* () {
      const store = yield* Documents;

      for (const user of ["u01", member, collector]) {
        const { api: client } = yield* signedIn(user);
        const expected = yield* store.visible(everything).pipe(asUser(user));
        const paged: Array<string> = [];

        for (let after: string | undefined, pages = 0; ; pages++) {
          const page = yield* client.documents.list({
            query: after === undefined ? { limit: 97 } : { after, limit: 97 },
          });

          paged.push(...page.ids);

          if (page.next === null) break;

          expect(page.ids).toHaveLength(97);
          expect(pages).toBeLessThan(100);
          after = page.next;
        }

        expect(expected.length, user).toBeGreaterThan(97);
        expect(paged, user).toEqual(expected);
      }
    }).pipe(Effect.scoped, Effect.provide(api)),
  120_000,
);

it.live("refuses callers without a valid session or token, and wrong passwords", () =>
  Effect.gen(function* () {
    yield* provision("u01");

    const anonymous = yield* browser;

    const wrong = yield* anonymous.auth.auth
      .signIn({ email: emailOf("u01"), password: "not the password" })
      .pipe(Effect.flip);

    // An unknown account answers as a wrong password, revealing nothing.
    const unknown = yield* anonymous.auth.auth
      .signIn({ email: emailOf(outsider), password: passwordOf(outsider) })
      .pipe(Effect.flip);

    expect(wrong._tag).toBe("PasswordRejected");
    expect(unknown._tag).toBe("PasswordRejected");
    expect(Cookies.isEmpty(yield* Ref.get(anonymous.cookies))).toBe(true);
    expect(yield* anonymous.api.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );

    yield* Ref.update(anonymous.cookies, Cookies.setUnsafe(SessionHttp.cookieName, "forged"));

    expect(yield* anonymous.api.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );

    // Malformed credentials are refused before authentication runs.
    yield* Ref.update(anonymous.cookies, Cookies.setUnsafe(SessionHttp.cookieName, ""));

    expect(yield* anonymous.api.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      OperationHttp.OperationHttpError.make({ reason: "credentials" }),
    );

    const impostor = yield* agent(Redacted.make("not-a-token"));

    expect(yield* impostor.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("hides what a user cannot view, refuses what they cannot edit and audits both", () =>
  Effect.gen(function* () {
    const { hidden, readOnly, editable } = yield* access(member);
    const { api: client } = yield* signedIn(member);

    expect(yield* client.documents.get({ params: { id: readOnly.id } })).toEqual(readOnly);
    expect(yield* client.documents.get({ params: { id: hidden.id } }).pipe(Effect.flip)).toEqual(
      new DocumentNotFound(),
    );
    expect(
      yield* client.documents
        .rename({ params: { id: hidden.id }, payload: { title: "Snooping" } })
        .pipe(Effect.flip),
    ).toEqual(new DocumentNotFound());
    expect(
      yield* client.documents
        .rename({ params: { id: readOnly.id }, payload: { title: "Defaced" } })
        .pipe(Effect.flip),
    ).toEqual(new Decision.Denied({ permission: "documents.edit" }));

    yield* client.documents.rename({ params: { id: editable.id }, payload: { title: "Renamed" } });

    expect((yield* client.documents.get({ params: { id: editable.id } })).title).toBe("Renamed");
    expect((yield* client.documents.get({ params: { id: readOnly.id } })).title).toBe(
      readOnly.title,
    );
    expect(
      (yield* recorded).map(({ action, outcome, actorId, actorKind, actorOnBehalfOf }) => [
        action,
        outcome,
        actorId,
        actorKind,
        actorOnBehalfOf,
      ]),
    ).toEqual([
      ["documents.edit", "Deny", member, "user", null],
      ["documents.edit", "Deny", member, "user", null],
      ["documents.edit", "Allow", member, "user", null],
      ["document.edited", "success", member, "user", null],
    ]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("changes nothing for a cookie without the app's Origin and CSRF header", () =>
  Effect.gen(function* () {
    const { editable } = yield* access(member);
    const session = yield* signedIn(member);

    // The same cookies, sent by a page on another site or by a plain form.
    const withoutCsrf = yield* HttpApiClient.makeWith(Api, {
      baseUrl: origin,
      httpClient: session.httpClient,
    });

    const crossSite = yield* HttpApiClient.makeWith(Api, {
      baseUrl: origin,
      httpClient: session.httpClient.pipe(
        HttpClient.mapRequest((request) =>
          request.pipe(
            HttpClientRequest.setHeader("origin", "https://attacker.test"),
            HttpClientRequest.setHeader("x-effect-auth-csrf", "1"),
          ),
        ),
      ),
    });

    const rename = { params: { id: editable.id }, payload: { title: "Forged" } };

    expect(yield* withoutCsrf.documents.rename(rename).pipe(Effect.flip)).toEqual(
      new CrossSiteRequest(),
    );
    expect(yield* crossSite.documents.rename(rename).pipe(Effect.flip)).toEqual(
      new CrossSiteRequest(),
    );
    expect(yield* crossSite.tokens.issue({ payload: { scopes: [] } }).pipe(Effect.flip)).toEqual(
      new CrossSiteRequest(),
    );
    expect(yield* withoutCsrf.documents.get({ params: { id: editable.id } })).toEqual(editable);
    expect(yield* recorded).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("confines an agent to its token's scopes, acting and audited for its user", () =>
  Effect.gen(function* () {
    const { visible, editable } = yield* access("u01");
    const { api: client } = yield* signedIn("u01");

    // Ids naming no permission are dropped rather than refused.
    const reading = yield* client.tokens.issue({
      payload: { scopes: ["documents.view", "documents.share"] },
    });

    const editing = yield* client.tokens.issue({
      payload: { scopes: ["documents.view", "documents.edit"] },
    });

    const reader = yield* agent(reading.token);
    const editor = yield* agent(editing.token);
    const rename = { params: { id: editable.id }, payload: { title: "By an agent" } };

    expect(reading.scopes).toEqual(["documents.view"]);
    expect((yield* reader.documents.list({ query: { limit: 100 } })).ids).toEqual(
      visible.slice(0, 100),
    );
    expect(yield* reader.documents.rename(rename).pipe(Effect.flip)).toEqual(
      new Decision.Denied({ permission: "documents.edit" }),
    );
    expect(yield* reader.tokens.issue({ payload: { scopes: [] } }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );

    yield* editor.documents.rename(rename);

    expect((yield* client.documents.get({ params: { id: editable.id } })).title).toBe(
      "By an agent",
    );
    expect(
      (yield* recorded).map(({ action, outcome, actorId, actorKind, actorOnBehalfOf }) => [
        action,
        outcome,
        actorId,
        actorKind,
        actorOnBehalfOf,
      ]),
    ).toEqual([
      ["documents.edit", "Deny", reading.id, "agent", "u01"],
      ["documents.edit", "Allow", editing.id, "agent", "u01"],
      ["document.edited", "success", editing.id, "agent", "u01"],
    ]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("lets only a token's owner revoke it, which ends the agent's access", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn("u01");
    const other = yield* signedIn("u02");
    const issued = yield* owner.api.tokens.issue({ payload: { scopes: ["documents.view"] } });
    const reader = yield* agent(issued.token);
    const revoke = { params: { id: issued.id } };

    expect(yield* other.api.tokens.revoke(revoke).pipe(Effect.flip)).toEqual(new TokenNotFound());
    expect((yield* reader.documents.list({ query: {} })).ids.length).toBeGreaterThan(0);

    yield* owner.api.tokens.revoke(revoke);

    expect(yield* reader.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );
    expect(yield* owner.api.tokens.revoke(revoke).pipe(Effect.flip)).toEqual(new TokenNotFound());
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("ends a deactivated account's sessions and its agents' access at once", () =>
  Effect.gen(function* () {
    const database = yield* Database;
    const session = yield* signedIn("u01");
    const issued = yield* session.api.tokens.issue({ payload: { scopes: ["documents.view"] } });
    const reader = yield* agent(issued.token);

    yield* database
      .update(users)
      .set({ active: false })
      .where(eq(users.id, "u01"))
      .pipe(Effect.orDie);

    const again = yield* browser;

    expect(yield* session.api.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );
    expect(yield* reader.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );
    expect(
      (yield* again.auth.auth
        .signIn({ email: emailOf("u01"), password: passwordOf("u01") })
        .pipe(Effect.flip))._tag,
    ).toBe("PasswordRejected");
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("revokes a session on sign-out, so a copy of its cookie stops working", () =>
  Effect.gen(function* () {
    const session = yield* signedIn("u01");
    const copied = yield* Ref.get(session.cookies);
    const replay = yield* browser;

    yield* Ref.set(replay.cookies, copied);
    yield* replay.api.documents.list({ query: {} });
    yield* session.auth.auth.signOut();

    expect(
      Cookies.getValue(yield* Ref.get(session.cookies), SessionHttp.cookieName).pipe(
        Option.filter((value) => value !== ""),
      ),
    ).toEqual(Option.none());
    expect(yield* replay.api.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("answers 503 with the directory's error, not 404 or 403, while it is down", () =>
  Effect.gen(function* () {
    const database = yield* Database;
    const { hidden, editable } = yield* access(member);
    const { api: client } = yield* signedIn(member);

    yield* database.$client.unsafe("DROP TABLE memberships");

    expect(yield* client.documents.list({ query: {} }).pipe(Effect.flip)).toEqual(
      new DirectoryUnavailable(),
    );
    expect(yield* client.documents.get({ params: { id: hidden.id } }).pipe(Effect.flip)).toEqual(
      new DirectoryUnavailable(),
    );
    expect(
      yield* client.documents
        .rename({ params: { id: editable.id }, payload: { title: "Lost" } })
        .pipe(Effect.flip),
    ).toEqual(new DirectoryUnavailable());
  }).pipe(Effect.scoped, Effect.provide(api)),
);
