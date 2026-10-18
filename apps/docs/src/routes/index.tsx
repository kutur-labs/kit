import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";
import { HomeLayout } from "fumadocs-ui/layouts/home";

import { KuturLabsLogo } from "@/components/kutur-labs-logo";
import { baseOptions } from "@/lib/layout-shared";
import { pageMeta } from "@/lib/meta";
import { source } from "@/lib/source";

const loadPackages = createServerFn({ method: "GET" })
  .middleware([staticFunctionMiddleware])
  // `getPages` has no defined order; `meta.json` sets it.
  .handler(() =>
    source
      .getPageTree()
      .children.flatMap((node) =>
        node.type === "folder" && node.$id === "packages" ? node.children : [],
      )
      .flatMap((node) => {
        const page = node.type === "page" ? source.getNodePage(node) : undefined;

        return page
          ? [{ name: page.slugs[1] ?? "", description: page.data.description ?? "" }]
          : [];
      }),
  );

export const Route = createFileRoute("/")({
  component: HomePage,
  loader: () => loadPackages(),
  head: () =>
    pageMeta({
      title: "Kutur Kit",
      description: "Open-source Effect libraries and tools from Kutur Labs.",
      path: "/",
    }),
});

function HomePage() {
  const packages = Route.useLoaderData();

  return (
    <HomeLayout {...baseOptions()}>
      <div className="kit-home mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">Kutur Kit</h1>
          <p className="mt-5 max-w-xl leading-relaxed text-fd-muted-foreground">
            Open-source Effect libraries and tools from Kutur Labs.
          </p>
          <div className="mt-6 flex gap-6 text-sm">
            <Link to="/docs/$" params={{ _splat: "" }} className="underline underline-offset-4">
              Documentation
            </Link>
            <a href="https://github.com/kutur-labs/kit" className="underline underline-offset-4">
              GitHub
            </a>
          </div>
        </header>
        <section aria-labelledby="approach" className="mt-14 space-y-5">
          <div>
            <h2 id="approach" className="text-base font-semibold">
              Definitions and implementations are separate
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
              A permission, asset or audit event is defined once. Its policy, bucket or log is a
              Layer you provide, so the same asset code can use a memory bucket in tests and R2 in
              production.
            </p>
          </div>
          <Link
            to="/docs/$"
            params={{ _splat: "architecture" }}
            className="inline-block text-sm underline underline-offset-4"
          >
            How the packages fit together
          </Link>
        </section>
        <section aria-labelledby="packages" className="mt-14">
          <h2 id="packages" className="mb-4 text-base font-semibold">
            Packages
          </h2>
          <div className="divide-y border-y">
            {packages.map((pkg) => (
              <Link
                key={pkg.name}
                to="/docs/$"
                params={{ _splat: `packages/${pkg.name}` }}
                className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6 hover:text-fd-muted-foreground"
              >
                <h3 className="font-mono text-sm">{pkg.name}</h3>
                <p className="text-sm leading-relaxed text-fd-muted-foreground">
                  {pkg.description}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-5 text-xs text-fd-muted-foreground">
            Alpha. APIs may change between releases.
          </p>
        </section>
        <section aria-labelledby="examples" className="mt-14">
          <h2 id="examples" className="text-base font-semibold">
            Examples
          </h2>
          <p className="mt-2 text-sm text-fd-muted-foreground">
            Try selected packages in your browser.
          </p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <Link
                to="/docs/$"
                params={{ _splat: "guides/permissions" }}
                className="underline underline-offset-4"
              >
                Check a permission and inspect its audit entry
              </Link>
            </li>
            <li>
              <Link
                to="/docs/$"
                params={{ _splat: "guides/storage" }}
                className="underline underline-offset-4"
              >
                Write a file and try an oversized overwrite
              </Link>
            </li>
          </ul>
        </section>
        <footer className="mt-16 border-t pt-6">
          <a
            href="https://kuturlabs.com"
            className="inline-flex items-center gap-2 text-sm text-fd-muted-foreground hover:text-fd-foreground"
          >
            <KuturLabsLogo className="size-4" />
            Kutur Labs
          </a>
          <p className="mt-4 text-xs text-fd-muted-foreground">© 2026 Kutur Labs</p>
        </footer>
      </div>
    </HomeLayout>
  );
}
