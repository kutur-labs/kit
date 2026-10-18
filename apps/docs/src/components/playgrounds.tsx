import type { ReactNode } from "react";

import { Cause, Effect, Exit } from "effect";
import { useState } from "react";

import { permissionDemo } from "@/demos/permission";
import { storageDemo } from "@/demos/storage";

function useRun() {
  const [output, setOutput] = useState("Choose inputs, then run the example.");
  const [pending, setPending] = useState(false);

  const run = <A, E>(program: Effect.Effect<A, E>) => {
    setPending(true);
    void Effect.runPromiseExit(program).then((exit) => {
      setOutput(
        Exit.isSuccess(exit) ? JSON.stringify(exit.value, null, 2) : Cause.pretty(exit.cause),
      );
      setPending(false);
    });
  };

  return { output, pending, run };
}

function DemoFrame({
  children,
  output,
  pending,
  run,
}: {
  children: ReactNode;
  output: string;
  pending: boolean;
  run: () => void;
}) {
  return (
    <div className="not-prose my-6 rounded-xl border bg-fd-card p-5">
      <fieldset disabled={pending} className="flex flex-col gap-4">
        <legend className="mb-4 text-sm font-medium">Try it in your browser</legend>
        {children}
        <button
          type="button"
          onClick={run}
          className="self-start rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground disabled:opacity-50"
        >
          {pending ? "Running…" : "Run example"}
        </button>
      </fieldset>
      <p className="mt-4 text-xs text-fd-muted-foreground">
        Each run starts fresh. Nothing is sent to a storage service.
      </p>
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-4">
        <p className="mb-2 text-sm font-medium">Result</p>
        <pre className="max-h-96 overflow-auto rounded-lg bg-fd-muted p-4 text-xs leading-relaxed">
          <code>{output}</code>
        </pre>
      </div>
    </div>
  );
}

const inputClass = "rounded-md border bg-fd-background p-2 text-sm";

export function PermissionPlayground() {
  const [userId, setUserId] = useState<"ada" | "bo">("ada");
  const [mode, setMode] = useState<"check" | "require">("require");
  const [restricted, setRestricted] = useState(false);
  const runner = useRun();

  return (
    <DemoFrame {...runner} run={() => runner.run(permissionDemo({ userId, mode, restricted }))}>
      <p className="text-sm">
        Ada owns note-1. Try editing as Bo, removing the token scope or switching to check.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Caller
        <select
          value={userId}
          onChange={(event) => setUserId(event.target.value === "ada" ? "ada" : "bo")}
          className={inputClass}
        >
          <option value="ada">Ada (owner)</option>
          <option value="bo">Bo (not the owner)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Operation
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value === "check" ? "check" : "require")}
          className={inputClass}
        >
          <option value="require">require: enforce, then save</option>
          <option value="check">check: ask without saving</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={restricted}
          onChange={(event) => setRestricted(event.target.checked)}
        />
        Token has no edit scope
      </label>
    </DemoFrame>
  );
}

export function StoragePlayground() {
  const [text, setText] = useState("Hello from Kit");
  const runner = useRun();

  return (
    <DemoFrame {...runner} run={() => runner.run(storageDemo(text))}>
      <p className="text-sm">
        The bucket starts with “Original note”. Replace it with up to 64 bytes of UTF-8 text.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Replacement text
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={256}
          className={inputClass}
        />
      </label>
      <p className="text-sm text-fd-muted-foreground">
        {new TextEncoder().encode(text).length} / 64 bytes
      </p>
      <button
        type="button"
        onClick={() => setText("é".repeat(33))}
        className="self-start text-sm underline underline-offset-4"
      >
        Try 66 bytes (33 characters)
      </button>
    </DemoFrame>
  );
}
