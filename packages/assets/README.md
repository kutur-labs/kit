# @kutur-kit/assets

Typed file storage for Effect. An asset declares its bucket, its keys, the content types it accepts and its maximum size. Storage is a Layer per bucket: memory, a directory, S3-compatible storage or an R2 bucket through [alchemy](https://alchemy.run). Clients can upload and download through signed URLs, and objects of public buckets get URLs under a CDN or public domain.

Tested with Effect 4.0.5.

```sh
pnpm add @kutur-kit/assets@alpha effect
```

## Assets

A bucket is a service. Its id names it in errors; the physical bucket is chosen by the Layer that provides it:

```ts
import { Asset, AssetBucket } from "@kutur-kit/assets";

export class Avatars extends AssetBucket.Service<Avatars>()("avatars") {}

export const Avatar = Asset.make("avatar", {
  bucket: Avatars,
  key: AvatarId,
  contentTypes: ["image/png", "image/jpeg", "image/webp"],
  maxSize: "2 MiB",
  cacheControl: "public, max-age=31536000, immutable",
});
```

| Option         | Meaning                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `bucket`       | The bucket service.                                                                                       |
| `key`          | A schema from the keys callers pass, such as a branded id, to a string. `Asset.Key` by default.           |
| `contentTypes` | Accepted media types, lowercase and without parameters. Required: there is no default.                    |
| `maxSize`      | A number of bytes or a string such as `"50 MiB"`.                                                         |
| `cacheControl` | The `Cache-Control` objects are stored and served with. `no-cache` by default. CDN rules can override it. |

Objects are stored under `<id>/<key>`, so several assets can share a bucket. Keys are checked before any request. Each segment uses S3's safe characters (letters, digits and `! - _ . ' ( )`), is not `.` or `..` and has at most 255 characters. A key has at most 1024 characters.

```ts
const program = Effect.gen(function* () {
  const info = yield* Avatar.put(avatarId, body, { contentType: "image/png", contentLength });
  const object = yield* Avatar.get(avatarId); // Option of { info, body }

  yield* Avatar.delete(avatarId);
});
```

`put` streams the body and fails with `Asset.TooLarge` as soon as it exceeds `maxSize`, with `Asset.ContentLengthMismatch` when it differs from the declared length and with `Asset.UnsupportedContentType` before reading it. A failed body leaves the previous object in place. `Asset.ContentType` and `Asset.Key` decode untrusted request values, such as headers and path parameters, to the types the asset accepts.

`get` and `head` fail with `Asset.UnexpectedContentType` for an object the asset does not accept, such as one written by other code.

## Storage

| Module                         | Backs a bucket with                                             |
| ------------------------------ | --------------------------------------------------------------- |
| `@kutur-kit/assets/memory`     | Memory, for tests.                                              |
| `@kutur-kit/assets/filesystem` | Files in a directory, for development.                          |
| `@kutur-kit/assets/s3`         | S3 or a store with its API, such as R2 or RustFS.               |
| `@kutur-kit/assets/alchemy/r2` | An R2 bucket declared with alchemy, through its Worker binding. |

```ts
import * as S3Assets from "@kutur-kit/assets/s3";

export const AvatarsLive = S3Assets.layer(Avatars, { bucket: "avatars" });
```

The S3 layer needs `Credentials` and an `HttpClient` from `@distilled.cloud/aws`, and an `Endpoint` for stores other than AWS. For R2, `S3Assets.r2Endpoint(accountId)` gives the endpoint; sign requests for the region `auto`.

## Signed uploads and downloads

Large files go from the client to storage directly. `AssetSigning.Upload(asset)` decodes what a client declares, and `presignPut` signs a URL for exactly that:

```ts
import * as AssetSigning from "@kutur-kit/assets/AssetSigning";

const NewFile = Schema.Struct({ ...AssetSigning.Upload(ProjectFile).fields, name: Schema.String });

const start = (upload: typeof NewFile.Type) =>
  Effect.gen(function* () {
    // A `SignedRequest`: the client sends its method, URL and headers as given.
    return yield* AssetSigning.presignPut(ProjectFile, fileId, upload, { expiresIn: "15 minutes" });
  });

const complete = (upload: typeof NewFile.Type) =>
  Effect.gen(function* () {
    // Fails with `AssetSigning.UploadNotConfirmed` unless the object arrived as declared.
    yield* AssetSigning.confirm(ProjectFile, fileId, upload);
  });
```

A signed upload is bound to its key, content type, length and the asset's cache control, and creates an object only: storage refuses a different request, and refuses the URL once the object exists. Confirm before recording an upload as complete, since the client may never send it.

`presignGet` signs a download URL. Signing is a service per bucket:

| Module                            | Signs                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| `S3Assets.signing`                | With SigV4, for S3-compatible storage.                               |
| `@kutur-kit/assets/alchemy/r2`    | With the S3 credentials alchemy binds to a Worker for an R2 bucket.  |
| `@kutur-kit/assets/signing/local` | With an HMAC, verified by its own routes, for development and tests. |

Browsers send a CORS preflight before a signed upload. Allow `AssetSigning.uploadHeaders` for `PUT` from your app's origin in the bucket's CORS rules; `AssetsR2.corsRule(origins)` builds that rule for alchemy.

## Public delivery

`AssetDelivery.layer(bucket, { baseUrl })` maps keys to URLs under a CDN or public domain, and `AssetDelivery.url(asset, key)` returns one. `@kutur-kit/assets/delivery/local` serves a bucket from your app's server, as a public bucket would be served, with the stored cache control, `nosniff` and a sandboxing content security policy.

Give an object a new key when its content changes, such as a new id per upload, so it can be cached with `immutable`.

## R2 with alchemy

```ts
import * as AssetsR2 from "@kutur-kit/assets/alchemy/r2";
import * as Cloudflare from "alchemy/Cloudflare";

const Uploads = Cloudflare.R2.Bucket("Uploads", {
  cors: [AssetsR2.corsRule(["https://app.example.com"])],
});

export default class Api extends Cloudflare.Worker<Api>()(
  "Api",
  { main: import.meta.url },
  Effect.gen(function* () {
    // ...
  }).pipe(
    Effect.provide(
      Layer.mergeAll(AssetsR2.layer(Avatars, Uploads), AssetsR2.signing(Avatars, Uploads)).pipe(
        Layer.provideMerge(Cloudflare.R2.ReadWriteBucketBinding),
      ),
    ),
  ),
) {}
```

`layer` stores through alchemy's `ReadWriteBucket`: provide `ReadWriteBucketBinding` in a Worker or `ReadWriteBucketHttp` elsewhere. Content type and cache control are stored as the object's HTTP metadata.

## Testing

`@kutur-kit/assets/testing` has contracts for other implementations: `AssetBucketContract.cases` for a bucket and `AssetSigningContract.cases` for signing and the storage it signs for. Each case is an Effect; run it with any test runner:

```ts
import * as Memory from "@kutur-kit/assets/memory";
import { AssetBucketContract } from "@kutur-kit/assets/testing";

for (const { name, run } of AssetBucketContract.cases)
  it.effect(name, () => run.pipe(Effect.provide(Memory.layer(AssetBucketContract.ContractBucket))));
```

## Requirements

- `effect` 4.0.5 or later 4.x.
- `@kutur-kit/assets/s3` needs `@distilled.cloud/aws` 1.0.0-rc.15.
- `@kutur-kit/assets/alchemy/r2` needs `alchemy` 2.0.0-beta.83.

## Limitations

- The S3 and R2 layers collect a body before sending it, so uploads through the app are limited by memory. Larger files belong in signed uploads.
- `alchemy/r2` works only in code bundled by alchemy: its modules import packages that other bundlers, such as Wrangler's, cannot resolve. Its bucket operations fail if called while a Worker is constructed rather than while it handles a request.
- `AssetsR2.signing` deploys a bucket-scoped API token for the Worker, which needs a Cloudflare API token with the account permission API Tokens Write. OAuth sessions cannot create one.
- Signed URLs work until they expire, whoever holds them. Removing a user's access does not revoke URLs already handed out.
- `signing/local` checks that an object does not exist before writing it, so two uploads racing to one key may both succeed.
- The filesystem layer is atomic for one process only.
- A changed `cacheControl` applies to new objects; stored objects keep theirs.
