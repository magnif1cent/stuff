import { prisma } from "@/lib/prisma";

export interface PersonSignatureVoteSummary {
  movieVotes: Map<string, number>;
  fightSceneVotes: Map<string, number>;
}

// Per-choice tallies for a person's signature vote -- one groupBy per
// column since a row only ever has one of movieId/fightSceneId set (see
// the model comment in schema.prisma).
export async function getPersonSignatureVoteSummary(personId: string): Promise<PersonSignatureVoteSummary> {
  const [movieRows, fightSceneRows] = await Promise.all([
    prisma.personSignatureVote.groupBy({
      by: ["movieId"],
      where: { personId, movieId: { not: null } },
      _count: { _all: true },
    }),
    prisma.personSignatureVote.groupBy({
      by: ["fightSceneId"],
      where: { personId, fightSceneId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return {
    movieVotes: new Map(movieRows.map((row) => [row.movieId as string, row._count._all])),
    fightSceneVotes: new Map(fightSceneRows.map((row) => [row.fightSceneId as string, row._count._all])),
  };
}
