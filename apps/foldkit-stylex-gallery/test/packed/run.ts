import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

import { Schema } from "effect";
import { request } from "playwright";

/** What a finished command exited with and printed, stdout and stderr together. */
export type Ran = Readonly<{ code: number | null; output: string }>;

/** Runs a command to its end. Resolves whatever it exits with; the caller asserts. */
export const run = (command: string, args: ReadonlyArray<string>, cwd: string) =>
  new Promise<Ran>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, NO_COLOR: "1" } });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });

/** Runs a command and rejects with its output unless it exits with 0. */
export const succeed = async (command: string, args: ReadonlyArray<string>, cwd: string) => {
  const ran = await run(command, args, cwd);

  if (ran.code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${ran.code} in ${cwd}:\n${ran.output}`,
    );
  }

  return ran.output;
};

const Listening = Schema.Struct({ port: Schema.Int });

const freePort = () =>
  new Promise<number>((resolve) => {
    const server = createServer().listen(0, "127.0.0.1", () => {
      const { port } = Schema.decodeUnknownSync(Listening)(server.address());
      server.close(() => resolve(port));
    });
  });

/** A Vite dev server, running until `stop`. */
export type DevServer = Readonly<{ url: string; output: () => string; stop: () => Promise<void> }>;

/**
 * Starts `vite` with `args` in `cwd` on a free port, with its dependency cache rebuilt, and
 * resolves once it answers. A server that never answers rejects with its output.
 */
export const startVite = async (
  vite: string,
  args: ReadonlyArray<string>,
  cwd: string,
): Promise<DevServer> => {
  const port = await freePort();

  const child = spawn(
    process.execPath,
    [vite, ...args, "--force", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd, env: { ...process.env, NO_COLOR: "1" } },
  );

  let output = "";
  child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
  const exited = new Promise<void>((resolve) => child.on("close", () => resolve()));
  const url = `http://127.0.0.1:${port}/`;

  const stop = async () => {
    child.kill();
    await exited;
  };

  const api = await request.newContext();

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const isAnswering = await api.head(url).then(
      () => true,
      () => false,
    );

    if (isAnswering) {
      await api.dispose();

      return { url, output: () => output, stop };
    }

    await delay(100);
  }

  await api.dispose();
  await stop();
  throw new Error(`vite ${args.join(" ")} did not answer on ${url}:\n${output}`);
};
