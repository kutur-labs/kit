import { Asset, AssetBucket } from "@kutur-kit/assets";
import * as Memory from "@kutur-kit/assets/memory";
import { Effect, Option, Stream } from "effect";

class Notes extends AssetBucket.Service<Notes>()("demo/Notes") {}

const NoteFile = Asset.make("note", {
  bucket: Notes,
  contentTypes: ["text/plain"],
  maxSize: 64,
});

const key = Asset.Key.make("welcome.txt");

const write = (text: string) =>
  NoteFile.put(key, Stream.succeed(new TextEncoder().encode(text)), { contentType: "text/plain" });

export const storageDemo = (text: string) =>
  Effect.gen(function* () {
    yield* write("Original note");

    const result = yield* write(text).pipe(
      Effect.as("Saved"),
      Effect.catchTag("AssetTooLarge", () => Effect.succeed("AssetTooLarge")),
    );

    const stored = yield* NoteFile.get(key);

    const content = Option.isSome(stored)
      ? yield* Stream.mkString(Stream.decodeText(stored.value.body))
      : null;

    yield* NoteFile.delete(key);
    const afterDelete = yield* NoteFile.get(key);

    return {
      result,
      attemptedBytes: new TextEncoder().encode(text).length,
      storedKey: yield* NoteFile.storedKey(key),
      content,
      existsAfterDelete: Option.isSome(afterDelete),
    };
  }).pipe(Effect.provide(Memory.layer(Notes)));
