import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPersonTributesPage,
  getPersonTributesCount,
  getPersonTributeVoteSummaries,
  PERSON_TRIBUTES_PAGE_SIZE,
} from "@/lib/person-tributes";
import { ActorTributesList } from "@/components/actor-tributes-list";

function pageHref(personId: string, page: number) {
  return page > 1 ? `/actors/${personId}/tributes?page=${page}` : `/actors/${personId}/tributes`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  const person = await prisma.person.findUnique({ where: { id: personId }, select: { name: true } });
  return person ? { title: `Tributes — ${person.name}` } : {};
}

export default async function PersonTributesPage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { personId } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true, name: true } });
  if (!person) {
    notFound();
  }

  const totalCount = await getPersonTributesCount(personId);
  const totalPages = Math.max(1, Math.ceil(totalCount / PERSON_TRIBUTES_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const { tributes } = await getPersonTributesPage(personId, page);
  const tributeIds = tributes.map((t) => t.id);

  const [voteSummaries, myVotes] = await Promise.all([
    getPersonTributeVoteSummaries(tributeIds),
    session?.user
      ? prisma.personTributeVote.findMany({
          where: { userId: session.user.id, tributeId: { in: tributeIds } },
        })
      : [],
  ]);
  const myVoteMap = new Map(myVotes.map((v) => [v.tributeId, v.value as 1 | -1]));

  const serializedTributes = tributes.map((tribute) => {
    const summary = voteSummaries.get(tribute.id);
    return {
      id: tribute.id,
      content: tribute.content,
      authorId: tribute.authorId,
      createdAt: tribute.createdAt.toISOString(),
      updatedAt: tribute.updatedAt.toISOString(),
      author: tribute.author,
      up: summary?.up ?? 0,
      down: summary?.down ?? 0,
      myVote: myVoteMap.get(tribute.id) ?? null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href={`/actors/${personId}`} className="text-sm text-red-500 hover:underline">
        ← Back to {person.name}
      </Link>
      <h1 className="mb-6 mt-2 font-serif text-2xl font-bold text-white">
        Tributes to {person.name}
      </h1>

      {serializedTributes.length === 0 ? (
        <p className="text-neutral-400">No tributes yet.</p>
      ) : (
        <>
          <ActorTributesList
            personId={personId}
            initialTributes={serializedTributes}
            signedIn={!!session?.user}
            currentUserId={session?.user?.id ?? null}
            isAdmin={session?.user?.role === "ADMIN"}
          />

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(personId, page - 1)} className="text-red-500 hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span className="text-neutral-600">← Previous</span>
              )}
              <span className="text-neutral-400">
                Page {page} of {totalPages} ({totalCount} tributes)
              </span>
              {page < totalPages ? (
                <Link href={pageHref(personId, page + 1)} className="text-red-500 hover:underline">
                  Next →
                </Link>
              ) : (
                <span className="text-neutral-600">Next →</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
