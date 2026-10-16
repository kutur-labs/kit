import type { Document, Membership, Role, Share } from "./domain.ts";

import { Array as Arr } from "effect";

// Seeded, so a failure reproduces with the same data.
const random = (seed: number) => {
  let state = seed;

  return (bound: number) => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;

    return Math.floor((state / 2_147_483_648) * bound);
  };
};

const pick = <A>(next: (bound: number) => number, pool: ReadonlyArray<A>): A => {
  const chosen = pool[next(pool.length)];

  if (chosen === undefined) throw new Error("Pools are never empty");

  return chosen;
};

export const orgs = ["o1", "o2", "o3"];

const teamsOf = (org: string) => [1, 2, 3].map((team) => `${org}-t${team}`);

export const users = Array.from(
  { length: 40 },
  (_, index) => `u${String(index + 1).padStart(2, "0")}`,
);

/** Belongs to no organization: sees public documents and nothing else. */
export const outsider = "outsider";

/** A guest of o1 shared most of its documents, for long membership lists. */
export const collector = "collector";

export const generate = (seed: number) => {
  const next = random(seed);

  const memberships: Array<Membership> = users.flatMap((userId, index) =>
    orgs.flatMap((orgId, orgIndex): Array<Membership> => {
      // Each organization's first user owns it; others join half of them.
      const role: Role | undefined =
        index === orgIndex
          ? "owner"
          : next(2) === 0
            ? pick(next, ["admin", "member", "member", "member", "guest"] as const)
            : undefined;

      return role === undefined
        ? []
        : [
            {
              userId,
              orgId,
              role,
              clearance: role === "owner" ? 3 : next(4),
              teams: teamsOf(orgId).filter(() => next(2) === 0),
            },
          ];
    }),
  );

  memberships.push({ userId: collector, orgId: "o1", role: "guest", clearance: 3, teams: [] });

  const membersOf = new Map(Object.entries(Arr.groupBy(memberships, ({ orgId }) => orgId)));

  const documents: Array<Document> = Array.from({ length: 3_000 }, (_, index) => {
    const orgId = pick(next, orgs);

    return {
      id: `doc-${String(index).padStart(4, "0")}`,
      orgId,
      teamId: next(3) === 0 ? null : pick(next, teamsOf(orgId)),
      ownerId: pick(next, membersOf.get(orgId) ?? []).userId,
      visibility: pick(next, ["private", "team", "org", "public"] as const),
      status: pick(next, ["draft", "published", "published", "archived"] as const),
      classification: next(4),
      legalHold: next(10) === 0,
      title: `Document ${index}`,
    };
  });

  const shares: Array<Share> = Array.from({ length: 2_000 }, () => ({
    documentId: pick(next, documents).id,
    userId: pick(next, users),
    access: pick(next, ["view", "view", "edit"] as const),
  }));

  // One share per user and document, as a share store would keep.
  const unique = [
    ...new Map(shares.map((share) => [`${share.userId}/${share.documentId}`, share])).values(),
  ];

  for (const document of documents)
    if (document.orgId === "o1" && next(10) < 8)
      unique.push({ documentId: document.id, userId: collector, access: "view" });

  return { memberships, documents, shares: unique };
};
