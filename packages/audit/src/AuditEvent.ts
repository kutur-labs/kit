import { Crypto, DateTime, Effect, Option, Schema } from "effect";

import * as Audit from "./Audit.ts";
import { type Codec, projectOrDie, rejectRedacted, viewOf } from "./internal/view.ts";

export interface Definition {
  /** The value an event is about, recorded through `view`. */
  readonly target?: Codec;
  /**
   * What to record of the target. By default, the fields marked with
   * `AuditKey.key`; `false` records no target.
   */
  readonly view?: Codec | false;
  readonly details?: Codec;
  /** The outcomes callers choose from. Without them, every event succeeds. */
  readonly outcomes?: readonly [string, ...ReadonlyArray<string>];
  /** See `Audit.RecordOptions`. */
  readonly isolated?: boolean;
}

export type TargetOf<D extends Definition> = D extends { readonly target: infer S extends Codec }
  ? S["Type"]
  : never;

export type Input<D extends Definition> = (D extends { readonly target: Codec }
  ? { readonly target: TargetOf<D> }
  : {}) &
  (D extends { readonly details: infer S extends Codec } ? { readonly details: S["Type"] } : {}) &
  (D extends { readonly outcomes: infer O extends ReadonlyArray<string> }
    ? { readonly outcome: O[number] }
    : {}) & { readonly reason?: string };

type CheckView<D extends Definition> = D extends { readonly view: infer V extends Codec }
  ? D extends { readonly target: Codec }
    ? [TargetOf<D>] extends [V["Type"]]
      ? unknown
      : { readonly view: Schema.Codec<TargetOf<D>, unknown> }
    : { readonly view?: false }
  : unknown;

export interface AuditEvent<A extends string, D extends Definition> {
  readonly action: A;
  readonly definition: D;
  readonly log: (
    ...input: {} extends Input<D> ? [input?: Input<D>] : [input: Input<D>]
  ) => Effect.Effect<void, never, Audit.AuditLog>;
}

// Web Crypto exists on every runtime Effect supports; apps that provide Crypto
// (as platform services do) replace it.
const webCrypto = Crypto.make({
  randomBytes: (size) => globalThis.crypto.getRandomValues(new Uint8Array(size)),
  digest: (algorithm, data) =>
    Effect.promise(() => globalThis.crypto.subtle.digest(algorithm, data)).pipe(
      Effect.map((digest) => new Uint8Array(digest)),
    ),
});

interface AnyInput {
  readonly target?: unknown;
  readonly details?: unknown;
  readonly outcome?: string;
  readonly reason?: string;
}

export const make = <const A extends string, const D extends Definition>(
  action: A,
  definition: D & CheckView<D>,
): AuditEvent<A, D> => {
  const view = viewOf(action, definition.target, definition.view);

  if (definition.details !== undefined) rejectRedacted(action, "details", definition.details);

  const json = (schema: Codec | undefined) => {
    if (schema === undefined) return undefined;

    const guard = projectOrDie(action, schema);
    const encode = Schema.encodeUnknownEffect(Schema.toCodecJson(schema));

    return (value: Codec["Type"]) => Effect.andThen(guard(value), Effect.orDie(encode(value)));
  };

  const [encodeTarget, encodeDetails] = [json(view), json(definition.details)];
  const options = { isolated: definition.isolated ?? false };

  const log = Effect.fnUntraced(function* (input: AnyInput = {}) {
    const auditLog = yield* Audit.AuditLog;
    const target = encodeTarget && (yield* encodeTarget(input.target));

    // Undefined details mean none, rather than an encoded null.
    const details =
      encodeDetails && input.details !== undefined
        ? yield* encodeDetails(input.details)
        : undefined;

    const crypto = Option.getOrElse(yield* Effect.serviceOption(Crypto.Crypto), () => webCrypto);

    const span = Option.getOrUndefined(yield* Effect.option(Effect.currentSpan));
    const actor = yield* Audit.CurrentActor;

    yield* auditLog.record(
      new Audit.Entry({
        id: yield* Effect.orDie(crypto.randomUUIDv7()),
        action,
        outcome: input.outcome ?? "success",
        ...(input.reason !== undefined && { reason: input.reason }),
        // SAFETY: toCodecJson encodes to JSON.
        ...(target !== undefined && { target: target as Schema.Json }),
        // SAFETY: toCodecJson encodes to JSON.
        ...(details !== undefined && { details: details as Schema.Json }),
        ...(actor !== undefined && { actor }),
        at: yield* DateTime.now,
        ...(span !== undefined && { traceId: span.traceId, spanId: span.spanId }),
      }),
      options,
    );
  });

  // SAFETY: Input<D> is an AnyInput with the fields D declares.
  return { action, definition, log: log as AuditEvent<A, D>["log"] };
};
