import type { Asset, AssetBucket } from "@kutur-kit/assets";

import * as AssetDelivery from "@kutur-kit/assets/AssetDelivery";
import * as Audit from "@kutur-kit/audit/Audit";
import * as AuditEvent from "@kutur-kit/audit/AuditEvent";
import { eq } from "drizzle-orm";
import { type ByteSize, Context, Crypto, Effect, Layer, Option, Schema, type Stream } from "effect";

import { users } from "./accounts.ts";
import { Avatar, type Avatars } from "./assets.ts";
import { Database, Transactions } from "./database.ts";
import { AvatarId, CurrentUser, StorageUnavailable, type UserId } from "./domain.ts";

export const AvatarChanged = AuditEvent.make("avatar.changed", {
  details: Schema.Struct({ contentType: Schema.String, size: Schema.Int }),
});

const unavailable = (error: AssetBucket.AssetBucketError) =>
  Effect.andThen(Effect.logError("Storage failed", error), Effect.fail(new StorageUnavailable()));

export class Profiles extends Context.Service<
  Profiles,
  {
    /** Replaces the current user's avatar with an upload passing through the app. */
    readonly replaceAvatar: (
      body: Stream.Stream<Uint8Array>,
      options: {
        readonly contentType: (typeof Avatar.contentTypes)[number];
        readonly contentLength: ByteSize.ByteSize | undefined;
      },
    ) => Effect.Effect<
      void,
      | Asset.UnsupportedContentType
      | Asset.TooLarge
      | Asset.ContentLengthMismatch
      | StorageUnavailable,
      CurrentUser
    >;
    /** The URL a user's avatar is served from, if they have one. */
    readonly avatarUrl: (id: UserId) => Effect.Effect<Option.Option<string>>;
  }
>()("dataroom/Profiles") {
  static readonly layer = Layer.effect(
    Profiles,
    Effect.gen(function* () {
      const database = yield* Database;
      const transactions = yield* Transactions;
      const auditLog = yield* Audit.AuditLog;
      const crypto = yield* Crypto.Crypto;

      // Storage, captured so operations need only the caller.
      const storage = yield* Effect.context<Avatars | AssetDelivery.DeliveryOf<Avatars>>();

      // Rows are written by this service, so an id that does not decode is a bug.
      const decodeId = Schema.decodeUnknownEffect(Schema.NullOr(AvatarId));

      const current = (user: UserId, lock: boolean) => {
        const query = database
          .select({ avatarId: users.avatarId })
          .from(users)
          .where(eq(users.id, user));

        return (lock ? query.for("update") : query).pipe(
          Effect.orDie,
          Effect.flatMap(([row]) => Effect.orDie(decodeId(row?.avatarId ?? null))),
          Effect.map(Option.fromNullOr),
        );
      };

      return Profiles.of({
        replaceAvatar: Effect.fn("Profiles.replaceAvatar")(function* (body, options) {
          const user = yield* CurrentUser;
          const id = AvatarId.make(yield* Effect.orDie(crypto.randomUUIDv7()));

          // Stored first, under a key no one reads yet. An upload that fails
          // here, or a transaction that does not commit, leaves an object no
          // row points to: a periodic sweep would delete those older than a
          // grace period, so uploads in progress are kept.
          const info = yield* Avatar.put(id, body, options).pipe(
            Effect.provide(storage),
            // Ids are generated here, so one that makes no key is a bug.
            Effect.catchTags({ AssetBucketError: unavailable, AssetInvalidKey: Effect.die }),
          );

          // Locked, so of two replacements each deletes the avatar it replaced.
          const previous = yield* transactions.run(
            Effect.gen(function* () {
              const replaced = yield* current(user.id, true);

              yield* database
                .update(users)
                .set({ avatarId: id })
                .where(eq(users.id, user.id))
                .pipe(Effect.orDie);
              yield* AvatarChanged.log({
                details: { contentType: info.contentType, size: Number(info.size) },
              });

              return replaced;
            }).pipe(Effect.provideService(Audit.AuditLog, auditLog)),
          );

          // After the commit: the old URL stops working only once no profile
          // links it. A failure leaves an orphan for the sweep.
          yield* Option.match(previous, {
            onNone: () => Effect.void,
            onSome: (old) =>
              Avatar.delete(old).pipe(
                Effect.provide(storage),
                Effect.catchTags({
                  AssetBucketError: (error) => Effect.logError("Orphaned avatar", error),
                  AssetInvalidKey: Effect.die,
                }),
              ),
          });
        }),
        // From the database alone: profiles are read far more than avatars change.
        avatarUrl: (user) =>
          current(user, false).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.succeedNone,
                onSome: (id) => Effect.asSome(AssetDelivery.url(Avatar, id)),
              }),
            ),
            Effect.provide(storage),
            Effect.catchTag("AssetInvalidKey", Effect.die),
          ),
      });
    }),
  );
}
