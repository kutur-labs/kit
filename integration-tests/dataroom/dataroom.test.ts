import { it } from "@effect/vitest";
import { Decision } from "@kutur-kit/access";
import { Asset } from "@kutur-kit/assets";
import * as AssetSigning from "@kutur-kit/assets/AssetSigning";
import { eq } from "drizzle-orm";
import { ByteSize, Effect, Exit, Layer, Option, Stream } from "effect";
import { type HttpClient, HttpClientRequest } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { expect } from "vitest";

import { Api, CrossSiteRequest, Unauthenticated } from "./api.ts";
import { Documents } from "./assets.ts";
import { auditEntries, Database, memberships } from "./database.ts";
import {
  FileNotFound,
  type FileId,
  ProjectNotFound,
  StorageUnavailable,
  type UserId,
} from "./domain.ts";
import {
  ada,
  app,
  bob,
  browser,
  cara,
  dan,
  eve,
  launch,
  merger,
  server,
  signedIn,
  storage,
} from "./fixture.ts";
import { origin } from "./server.ts";

// Authentication evidence is checked against the database's clock, and storage
// checks signatures against its own, so these tests run on the live clock.
const api = server.pipe(Layer.provideMerge(app(storage())));

const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n");

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const asPdf = (name = "Plan.pdf", body = pdf) => ({
  name,
  contentType: "application/pdf" as const,
  size: ByteSize.bytes(body.length),
});

type Session = Effect.Success<ReturnType<typeof signedIn>>;

/** Starts uploading a PDF to the launch project, as the user. */
const start = (session: Session, name = "Plan.pdf", body = pdf) =>
  session.api.projects.upload({ params: { id: launch }, payload: asPdf(name, body) });

/** Sends a signed request as the browser would: straight to storage, with its headers. */
const send = (
  session: Session,
  grant: AssetSigning.SignedRequest,
  body?: Uint8Array,
  options: { readonly contentType?: string; readonly url?: string } = {},
) =>
  session.storage.execute(
    HttpClientRequest.make(grant.method)(options.url ?? grant.url).pipe(
      HttpClientRequest.setHeaders(grant.headers),
      (request) =>
        body === undefined
          ? request
          : HttpClientRequest.bodyUint8Array(
              request,
              body,
              options.contentType ?? grant.headers["content-type"] ?? "",
            ),
    ),
  );

/** Uploads a file to the launch project as the user, through storage, and completes it. */
const shared = (session: Session, name = "Plan.pdf", body = pdf) =>
  Effect.gen(function* () {
    const { file, upload } = yield* start(session, name, body);

    yield* send(session, upload, body);

    return yield* session.api.files.complete({ params: { id: file.id } });
  });

/** Downloads a file as the user would: a link from the API, then the bytes from storage. */
const downloaded = (session: Session, id: FileId) =>
  Effect.gen(function* () {
    const response = yield* send(session, yield* session.api.files.download({ params: { id } }));

    return {
      status: response.status,
      contentType: response.headers["content-type"],
      body: new Uint8Array(yield* response.arrayBuffer),
    };
  });

/** What storage holds for a file, read behind the API: refused uploads must leave nothing. */
const stored = (id: FileId) =>
  Effect.flatMap(Documents, (bucket) => bucket.head(`projects/${launch}/${id}`));

const recorded = Effect.gen(function* () {
  const database = yield* Database;

  const rows = yield* database
    .select()
    .from(auditEntries)
    .orderBy(auditEntries.at, auditEntries.id)
    .pipe(Effect.orDie);

  return rows.map(({ action, outcome, actorId }) => [action, outcome, actorId] as const);
});

it.live("shares a file through storage: uploaded to it directly, then downloaded from it", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const member = yield* signedIn(bob);

    const { file, upload } = yield* start(owner);

    expect(file).toMatchObject({ status: "pending", uploaderId: ada, size: pdf.length });
    // Signed for storage, not the app: the bytes never pass through it.
    expect(new URL(upload.url).origin).not.toBe(origin);
    expect(upload.headers).toEqual({
      "content-type": "application/pdf",
      "if-none-match": "*",
      "cache-control": "no-cache",
    });
    expect((yield* send(owner, upload, pdf)).status).toBe(200);
    expect(yield* owner.api.files.complete({ params: { id: file.id } })).toEqual({
      ...file,
      status: "ready",
    });
    expect(yield* member.api.projects.files({ params: { id: launch } })).toEqual([
      { ...file, status: "ready" },
    ]);
    expect(yield* downloaded(member, file.id)).toEqual({
      status: 200,
      contentType: "application/pdf",
      body: pdf,
    });
    expect(yield* recorded).toEqual([
      ["files.upload", "Allow", ada],
      ["file.uploaded", "success", ada],
      ["file.download_issued", "success", bob],
    ]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("refuses uploads to guests, hides projects from other organizations, and audits", () =>
  Effect.gen(function* () {
    const guest = yield* signedIn(cara);
    const other = yield* signedIn(dan);
    const stranger = yield* signedIn(eve);
    const upload = { params: { id: launch }, payload: asPdf() };

    expect(yield* guest.api.projects.upload(upload).pipe(Effect.flip)).toEqual(
      new Decision.Denied({ permission: "files.upload" }),
    );
    expect(yield* other.api.projects.upload(upload).pipe(Effect.flip)).toEqual(
      new ProjectNotFound(),
    );
    expect(
      yield* stranger.api.projects.files({ params: { id: launch } }).pipe(Effect.flip),
    ).toEqual(new ProjectNotFound());
    // A project of another organization answers as one that does not exist.
    expect(yield* guest.api.projects.files({ params: { id: merger } }).pipe(Effect.flip)).toEqual(
      new ProjectNotFound(),
    );
    expect(yield* guest.api.projects.files({ params: { id: launch } })).toEqual([]);
    // Only decisions are recorded: dan cannot see the project, so his upload
    // is never decided.
    expect(yield* recorded).toEqual([["files.upload", "Deny", cara]]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("refuses declarations the asset would not accept, before any upload", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);

    expect(
      yield* owner.api.projects
        .upload({
          params: { id: launch },
          payload: { ...asPdf(), size: ByteSize.mebibytes(51) },
        })
        .pipe(Effect.flip),
    ).toEqual(new Asset.TooLarge({ asset: "projects", maxSize: ByteSize.mebibytes(50) }));

    // Types and names decode with the API's schemas, so others are malformed.
    for (const payload of [
      { name: "Logo.svg", contentType: "image/svg+xml", size: 10 },
      { name: "Page.html", contentType: "text/html", size: 10 },
      { name: "", contentType: "application/pdf", size: 10 },
      { name: "Plan.pdf", contentType: "application/pdf", size: -1 },
    ]) {
      const response = yield* owner.httpClient.execute(
        HttpClientRequest.post(`${origin}/projects/${launch}/files`).pipe(
          HttpClientRequest.setHeader("x-effect-auth-csrf", "1"),
          HttpClientRequest.bodyJsonUnsafe(payload),
        ),
      );

      expect(response.status, JSON.stringify(payload)).toBe(400);
    }

    expect(yield* owner.api.projects.files({ params: { id: launch } })).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("stores nothing a grant does not cover, and confirms nothing missing", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);

    const { file, upload } = yield* start(owner);

    const other = yield* start(owner);

    const attempts = [
      // An HTML page in the file's place, to run on a link to it.
      yield* send(owner, upload, pdf, { contentType: "text/html" }),
      yield* send(owner, upload, new Uint8Array([...pdf, 0x20])),
      yield* send(owner, upload, pdf.slice(1)),
      // The grant for one file used to write another.
      yield* send(owner, upload, pdf, { url: upload.url.replace(file.id, other.file.id) }),
    ];

    expect(attempts.map(({ status }) => status)).toEqual([403, 403, 403, 403]);
    expect(Option.isNone(yield* stored(file.id))).toBe(true);
    expect(Option.isNone(yield* stored(other.file.id))).toBe(true);
    expect(yield* owner.api.files.complete({ params: { id: file.id } }).pipe(Effect.flip)).toEqual(
      new AssetSigning.UploadNotConfirmed({ asset: "projects", reason: "missing" }),
    );
    expect(yield* owner.api.projects.files({ params: { id: launch } })).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("confirms an upload only as declared, even when storage changed behind the app", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const bucket = yield* Documents;

    for (const [contentType, body, reason] of [
      ["application/pdf", new Uint8Array([...pdf, 0x20]), "size"],
      ["text/html", pdf, "contentType"],
    ] as const) {
      const { file } = yield* start(owner);

      // Written by something other than the grant, such as a script with the
      // bucket's keys.
      yield* bucket.put({
        key: `projects/${launch}/${file.id}`,
        contentType,
        body: Stream.make(body),
      });

      expect(
        yield* owner.api.files.complete({ params: { id: file.id } }).pipe(Effect.flip),
      ).toEqual(new AssetSigning.UploadNotConfirmed({ asset: "projects", reason }));
    }

    expect(yield* owner.api.projects.files({ params: { id: launch } })).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("keeps a pending file to its uploader, who cannot download it before it completes", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const member = yield* signedIn(bob);

    const { file, upload } = yield* start(owner);

    const params = { params: { id: file.id } };

    yield* send(owner, upload, pdf);

    expect(yield* member.api.files.complete(params).pipe(Effect.flip)).toEqual(new FileNotFound());
    expect(yield* member.api.files.download(params).pipe(Effect.flip)).toEqual(new FileNotFound());
    expect(yield* owner.api.files.download(params).pipe(Effect.flip)).toEqual(new FileNotFound());
    expect(yield* member.api.projects.files({ params: { id: launch } })).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("completes an upload once, however often the client retries", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);

    const { file, upload } = yield* start(owner);

    yield* send(owner, upload, pdf);

    const completed = yield* Effect.forEach(
      [1, 2, 3],
      () => owner.api.files.complete({ params: { id: file.id } }),
      { concurrency: "unbounded" },
    );

    expect(completed).toEqual([1, 2, 3].map(() => ({ ...file, status: "ready" })));
    expect((yield* recorded).filter(([action]) => action === "file.uploaded")).toEqual([
      ["file.uploaded", "success", ada],
    ]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("keeps files to their organization, whatever id a caller tries", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const file = yield* shared(owner);
    const other = yield* signedIn(dan);
    const stranger = yield* signedIn(eve);

    for (const session of [other, stranger]) {
      const params = { params: { id: file.id } };

      expect(yield* session.api.files.download(params).pipe(Effect.flip)).toEqual(
        new FileNotFound(),
      );
      expect(yield* session.api.files.remove(params).pipe(Effect.flip)).toEqual(new FileNotFound());
    }

    expect((yield* downloaded(owner, file.id)).body).toEqual(pdf);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("lets the uploader or an owner delete a file, which ends its download links", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const member = yield* signedIn(bob);
    const guest = yield* signedIn(cara);

    const mine = yield* shared(member, "Notes.pdf");
    const theirs = yield* shared(owner, "Budget.pdf");
    const link = yield* member.api.files.download({ params: { id: mine.id } });

    // A member deletes only their own; a guest nothing.
    expect(yield* member.api.files.remove({ params: { id: theirs.id } }).pipe(Effect.flip)).toEqual(
      new Decision.Denied({ permission: "files.delete" }),
    );
    expect(yield* guest.api.files.remove({ params: { id: mine.id } }).pipe(Effect.flip)).toEqual(
      new Decision.Denied({ permission: "files.delete" }),
    );

    // The organization's owner deletes anyone's.
    yield* owner.api.files.remove({ params: { id: mine.id } });

    expect(yield* member.api.projects.files({ params: { id: launch } })).toEqual([theirs]);
    expect((yield* send(member, link)).status).toBe(404);
    expect(
      (yield* recorded).filter(
        ([action]) => action !== "files.upload" && action !== "file.uploaded",
      ),
    ).toEqual([
      ["file.download_issued", "success", bob],
      ["files.delete", "Deny", bob],
      ["files.delete", "Deny", cara],
      ["files.delete", "Allow", ada],
      ["file.deleted", "success", ada],
    ]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("changes nothing for callers without a session or the app's CSRF header", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const anonymous = yield* browser;

    // The same cookies, sent by a page on another site or by a plain form.
    const withoutCsrf = yield* HttpApiClient.makeWith(Api, {
      baseUrl: origin,
      httpClient: owner.httpClient,
    });

    const upload = { params: { id: launch }, payload: asPdf() };

    expect(yield* withoutCsrf.projects.upload(upload).pipe(Effect.flip)).toEqual(
      new CrossSiteRequest(),
    );
    expect(yield* anonymous.api.projects.upload(upload).pipe(Effect.flip)).toEqual(
      new Unauthenticated(),
    );
    expect(
      yield* anonymous.api.projects.files({ params: { id: launch } }).pipe(Effect.flip),
    ).toEqual(new Unauthenticated());
    expect(yield* owner.api.projects.files({ params: { id: launch } })).toEqual([]);
    expect(yield* recorded).toEqual([]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

const avatarOf = (user: UserId) =>
  Effect.flatMap(browser, (anonymous) =>
    Effect.map(anonymous.api.profiles.get({ params: { id: user } }), ({ avatarUrl }) => avatarUrl),
  );

it.live("serves an avatar uploaded through the app to anyone, from the CDN path", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);

    yield* owner.api.account.avatar({ payload: png });

    const avatarUrl = yield* avatarOf(ada);

    expect(avatarUrl).toMatch(/^\/cdn\/avatars\/avatar\/[\da-f]{8}-[\da-f-]{27}$/u);
    expect(yield* avatarOf(bob)).toBeNull();

    const anonymous = yield* browser;

    const response = yield* anonymous.httpClient.execute(
      HttpClientRequest.get(`${origin}${avatarUrl ?? ""}`),
    );

    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject({
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    });
    expect(new Uint8Array(yield* response.arrayBuffer)).toEqual(png);
    expect(yield* recorded).toEqual([["avatar.changed", "success", ada]]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("refuses avatars of other types or sizes, and from callers without a session", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const anonymous = yield* browser;

    const put = (
      session: { readonly httpClient: HttpClient.HttpClient },
      body: Uint8Array,
      type: string,
    ) =>
      session.httpClient.execute(
        HttpClientRequest.put(`${origin}/me/avatar`).pipe(
          HttpClientRequest.setHeader("x-effect-auth-csrf", "1"),
          HttpClientRequest.bodyUint8Array(body, type),
        ),
      );

    const svg = new TextEncoder().encode("<svg onload=alert(1)/>");

    expect((yield* put(owner, svg, "image/svg+xml")).status).toBe(415);
    expect((yield* put(owner, new Uint8Array(3 * 1024 * 1024), "image/png")).status).toBe(413);
    expect((yield* put(anonymous, png, "image/png")).status).toBe(401);
    expect(yield* avatarOf(ada)).toBeNull();
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("answers 503 without details when storage refuses the app", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);

    // Signing needs no request to storage, so an upload starts; completing it does.
    const { file } = yield* start(owner);

    expect(yield* owner.api.files.complete({ params: { id: file.id } }).pipe(Effect.flip)).toEqual(
      new StorageUnavailable(),
    );
    expect(yield* owner.api.account.avatar({ payload: png }).pipe(Effect.flip)).toEqual(
      new StorageUnavailable(),
    );
    // Profiles read the database alone, so they still answer.
    expect(yield* avatarOf(ada)).toBeNull();
  }).pipe(
    Effect.scoped,
    Effect.provide(server.pipe(Layer.provideMerge(app(storage({ refused: true }))))),
  ),
);

// Edge cases and limits of the flow above.

it.live("lets browsers upload to storage from the app's origin only, as its CORS rules allow", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const { upload } = yield* start(owner);

    // What a browser sends before the upload: its headers are not CORS-safelisted.
    const preflight = (from: string) =>
      Effect.map(
        owner.storage.execute(
          HttpClientRequest.make("OPTIONS")(upload.url).pipe(
            HttpClientRequest.setHeaders({
              origin: from,
              "access-control-request-method": upload.method,
              "access-control-request-headers": Object.keys(upload.headers).join(","),
            }),
          ),
        ),
        (response) => response.status,
      );

    expect(yield* preflight(origin)).toBe(200);
    expect(yield* preflight("https://elsewhere.test")).toBe(403);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live(
  "round-trips an empty file and one of exactly the maximum size",
  () =>
    Effect.gen(function* () {
      const owner = yield* signedIn(ada);
      const largest = new Uint8Array(Number(ByteSize.mebibytes(50))).fill(0x25);

      for (const body of [new Uint8Array(), largest]) {
        const file = yield* shared(owner, `${body.length}.pdf`, body);
        const download = yield* downloaded(owner, file.id);

        expect(download.status).toBe(200);
        expect(download.body.length).toBe(body.length);
      }
    }).pipe(Effect.scoped, Effect.provide(api)),
  60_000,
);

it.live("keeps file names out of storage keys", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);

    for (const name of [
      "../../avatars/avatar/ada",
      "a/b/c.pdf",
      "résumé 📄.pdf",
      "x".repeat(200),
    ]) {
      const file = yield* shared(owner, name);

      expect(file.name).toBe(name);
      expect((yield* downloaded(owner, file.id)).body).toEqual(pdf);
    }

    expect(yield* avatarOf(ada)).toBeNull();
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("deletes a file once when deletions race, recording one deletion", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const file = yield* shared(owner);

    const results = yield* Effect.forEach(
      [1, 2, 3],
      () => Effect.exit(owner.api.files.remove({ params: { id: file.id } })),
      { concurrency: "unbounded" },
    );

    expect(results.filter(Exit.isSuccess)).toHaveLength(1);
    expect((yield* recorded).filter(([action]) => action === "file.deleted")).toHaveLength(1);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("refuses a removed member new links and completions", () =>
  Effect.gen(function* () {
    const database = yield* Database;
    const member = yield* signedIn(bob);
    const ready = yield* shared(member);
    const { file, upload } = yield* start(member);

    yield* send(member, upload, pdf);
    yield* database.delete(memberships).where(eq(memberships.userId, bob)).pipe(Effect.orDie);

    const params = (id: FileId) => ({ params: { id } });

    expect(yield* member.api.files.download(params(ready.id)).pipe(Effect.flip)).toEqual(
      new FileNotFound(),
    );
    expect(yield* member.api.files.complete(params(file.id)).pipe(Effect.flip)).toEqual(
      new FileNotFound(),
    );
    expect(yield* member.api.projects.files({ params: { id: launch } }).pipe(Effect.flip)).toEqual(
      new ProjectNotFound(),
    );
  }).pipe(Effect.scoped, Effect.provide(api)),
);

// Grants are write-once: storage refuses a second upload to the key, so no
// one holding a grant can replace a file after it was confirmed.
it.live("keeps a completed file's bytes as confirmed, whoever still holds its grant", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const { file, upload } = yield* start(owner);

    yield* send(owner, upload, pdf);
    yield* owner.api.files.complete({ params: { id: file.id } });

    // Same type and length, other bytes, sent again with the upload's grant.
    const replaced = yield* send(
      owner,
      upload,
      pdf.map(() => 0x3c),
    );

    expect(replaced.status).toBe(412);
    expect((yield* downloaded(owner, file.id)).body).toEqual(pdf);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

it.live("gives a replaced avatar a new URL and removes the old image", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const anonymous = yield* browser;
    const other = png.map((byte, index) => (index === 60 ? 1 : byte));

    const fetched = (url: string | null) =>
      Effect.flatMap(
        anonymous.httpClient.execute(HttpClientRequest.get(`${origin}${url ?? ""}`)),
        (response) =>
          Effect.map(response.arrayBuffer, (body) => ({
            status: response.status,
            body: new Uint8Array(body),
          })),
      );

    yield* owner.api.account.avatar({ payload: png });

    const first = yield* avatarOf(ada);

    yield* owner.api.account.avatar({ payload: other });

    const second = yield* avatarOf(ada);

    expect(second).not.toBe(first);
    expect((yield* fetched(second)).body).toEqual(other);
    expect((yield* fetched(first)).status).toBe(404);
    expect(yield* recorded).toEqual([
      ["avatar.changed", "success", ada],
      ["avatar.changed", "success", ada],
    ]);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

// Known limitations: what happens today, by design.

// Signed URLs are bearer tokens until they expire: storage cannot know that
// the app removed the member. Links last 5 minutes to bound this.
it.live("keeps serving a removed member's download link until it expires", () =>
  Effect.gen(function* () {
    const database = yield* Database;
    const member = yield* signedIn(bob);
    const file = yield* shared(member);
    const link = yield* member.api.files.download({ params: { id: file.id } });

    yield* database.delete(memberships).where(eq(memberships.userId, bob)).pipe(Effect.orDie);

    expect(yield* member.api.files.download({ params: { id: file.id } }).pipe(Effect.flip)).toEqual(
      new FileNotFound(),
    );
    expect((yield* send(member, link)).status).toBe(200);
  }).pipe(Effect.scoped, Effect.provide(api)),
);

// Not supported yet. Each test below states the behaviour we want and fails
// today; `fails` passes while it does, and fails once the behaviour exists.

// A pending file is visible only to its uploader, so no one else can delete
// it: an upload abandoned by a member stays pending, with whatever reached
// storage, until a cleanup job or bucket lifecycle rule removes it.
it.live.fails("lets an owner remove a member's abandoned upload", () =>
  Effect.gen(function* () {
    const owner = yield* signedIn(ada);
    const member = yield* signedIn(bob);
    const { file } = yield* start(member);

    yield* owner.api.files.remove({ params: { id: file.id } });

    expect(yield* member.api.files.complete({ params: { id: file.id } }).pipe(Effect.flip)).toEqual(
      new FileNotFound(),
    );
  }).pipe(Effect.scoped, Effect.provide(api)),
);
