// Sample/placeholder data for local development so the app is browsable before a
// TMDB_API_KEY is configured. Real catalog content should come from /admin/import.
// tmdbId values here are placeholders (900000+) and do not correspond to real TMDB records.
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const GENRES = [
  { tmdbId: 28, name: "Action" },
  { tmdbId: 900101, name: "Martial Arts" },
  { tmdbId: 18, name: "Drama" },
];

const SAMPLE_MOVIES = [
  {
    tmdbId: 900001,
    title: "Enter the Dragon",
    overview: "Sample data: an undercover agent enters a martial arts tournament hosted by a crime lord.",
    releaseDate: "1973-08-19",
    runtime: 102,
    director: "Robert Clouse",
    country: "Hong Kong",
    tmdbRating: 7.6,
    tmdbPopularity: 32,
    genres: ["Action", "Martial Arts"],
    cast: [{ tmdbId: 900201, name: "Bruce Lee", character: "Lee" }],
  },
  {
    tmdbId: 900002,
    title: "Ip Man",
    overview: "Sample data: a biographical account of the Wing Chun grandmaster who later trained Bruce Lee.",
    releaseDate: "2008-12-12",
    runtime: 106,
    director: "Wilson Yip",
    country: "Hong Kong",
    tmdbRating: 8.0,
    tmdbPopularity: 28,
    genres: ["Action", "Martial Arts", "Drama"],
    cast: [{ tmdbId: 900202, name: "Donnie Yen", character: "Ip Man" }],
  },
  {
    tmdbId: 900003,
    title: "Drunken Master",
    overview: "Sample data: a mischievous student is trained in an unorthodox style of kung fu by a wandering master.",
    releaseDate: "1978-10-05",
    runtime: 111,
    director: "Yuen Woo-ping",
    country: "Hong Kong",
    tmdbRating: 7.5,
    tmdbPopularity: 21,
    genres: ["Action", "Martial Arts"],
    cast: [{ tmdbId: 900203, name: "Jackie Chan", character: "Wong Fei-hung" }],
  },
  {
    tmdbId: 900004,
    title: "Crouching Tiger, Hidden Dragon",
    overview: "Sample data: two warriors pursue a stolen sword and a notorious fugitive across ancient China.",
    releaseDate: "2000-07-06",
    runtime: 120,
    director: "Ang Lee",
    country: "Taiwan",
    tmdbRating: 7.9,
    tmdbPopularity: 26,
    genres: ["Action", "Drama", "Martial Arts"],
    cast: [{ tmdbId: 900204, name: "Michelle Yeoh", character: "Yu Shu Lien" }],
  },
];

async function main() {
  const genreByName = new Map<string, { id: string }>();
  for (const genre of GENRES) {
    const created = await prisma.genre.upsert({
      where: { tmdbId: genre.tmdbId },
      update: { name: genre.name },
      create: genre,
    });
    genreByName.set(genre.name, created);
  }

  for (const movie of SAMPLE_MOVIES) {
    const created = await prisma.movie.upsert({
      where: { tmdbId: movie.tmdbId },
      update: {},
      create: {
        tmdbId: movie.tmdbId,
        title: movie.title,
        overview: movie.overview,
        releaseDate: new Date(movie.releaseDate),
        runtime: movie.runtime,
        director: movie.director,
        country: movie.country,
        tmdbRating: movie.tmdbRating,
        tmdbPopularity: movie.tmdbPopularity,
        genres: { connect: movie.genres.map((name) => ({ id: genreByName.get(name)!.id })) },
      },
    });

    for (const [index, castMember] of movie.cast.entries()) {
      const person = await prisma.person.upsert({
        where: { tmdbId: castMember.tmdbId },
        update: { name: castMember.name },
        create: { tmdbId: castMember.tmdbId, name: castMember.name },
      });
      await prisma.castCredit.upsert({
        where: { movieId_personId: { movieId: created.id, personId: person.id } },
        update: { characterName: castMember.character, order: index },
        create: {
          movieId: created.id,
          personId: person.id,
          characterName: castMember.character,
          order: index,
        },
      });
    }
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { emailVerified: new Date() },
    create: {
      username: "admin",
      usernameLower: "admin",
      email: "admin@example.com",
      role: "ADMIN",
      passwordHash: await bcrypt.hash("admin1234", 10),
      // Seed accounts are pre-verified so local testing doesn't require
      // clicking a real verification link.
      emailVerified: new Date(),
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { emailVerified: new Date() },
    create: {
      username: "member",
      usernameLower: "member",
      email: "member@example.com",
      role: "USER",
      passwordHash: await bcrypt.hash("member1234", 10),
      emailVerified: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: "reviewer@example.com" },
    update: { emailVerified: new Date() },
    create: {
      username: "reviewer",
      usernameLower: "reviewer",
      email: "reviewer@example.com",
      role: "REVIEWER",
      passwordHash: await bcrypt.hash("reviewer1234", 10),
      emailVerified: new Date(),
    },
  });

  const enterTheDragon = await prisma.movie.findUniqueOrThrow({ where: { tmdbId: 900001 } });
  await prisma.rating.upsert({
    where: { userId_movieId: { userId: member.id, movieId: enterTheDragon.id } },
    update: { score: 9 },
    create: { userId: member.id, movieId: enterTheDragon.id, score: 9 },
  });
  await prisma.adminRating.upsert({
    where: { adminId_movieId: { adminId: admin.id, movieId: enterTheDragon.id } },
    update: { score: 9, note: "A genre-defining classic." },
    create: { adminId: admin.id, movieId: enterTheDragon.id, score: 9, note: "A genre-defining classic." },
  });
  await prisma.subcategoryRating.upsert({
    where: {
      userId_movieId_category: { userId: member.id, movieId: enterTheDragon.id, category: "FIGHT_CHOREOGRAPHY" },
    },
    update: { score: 10 },
    create: { userId: member.id, movieId: enterTheDragon.id, category: "FIGHT_CHOREOGRAPHY", score: 10 },
  });
  await prisma.subcategoryAdminRating.upsert({
    where: {
      adminId_movieId_category: { adminId: admin.id, movieId: enterTheDragon.id, category: "FIGHT_CHOREOGRAPHY" },
    },
    update: { score: 10 },
    create: { adminId: admin.id, movieId: enterTheDragon.id, category: "FIGHT_CHOREOGRAPHY", score: 10 },
  });

  const FIGHT_SCENE_TAGS = ["One vs. Many", "Weapon Duel", "Mirror Maze"];
  const tagByName = new Map<string, { id: string }>();
  for (const name of FIGHT_SCENE_TAGS) {
    const tag = await prisma.fightSceneTag.upsert({ where: { name }, update: {}, create: { name } });
    tagByName.set(name, tag);
  }

  const bruceLee = await prisma.person.findUniqueOrThrow({ where: { tmdbId: 900201 } });
  const existingFightScene = await prisma.fightScene.findFirst({
    where: { movieId: enterTheDragon.id, submittedById: member.id },
  });
  const fightScene =
    existingFightScene ??
    (await prisma.fightScene.create({
      data: {
        movieId: enterTheDragon.id,
        submittedById: member.id,
        title: "Mirror room finale",
        // Sample data: not a real YouTube video id.
        youtubeVideoId: "sampleClip1",
        isVerified: true,
        cast: { create: [{ personId: bruceLee.id, order: 0 }] },
        tags: { connect: ["One vs. Many", "Mirror Maze"].map((name) => ({ id: tagByName.get(name)!.id })) },
      },
    }));
  await prisma.fightSceneRating.upsert({
    where: { userId_fightSceneId: { userId: member.id, fightSceneId: fightScene.id } },
    update: { score: 10 },
    create: { userId: member.id, fightSceneId: fightScene.id, score: 10 },
  });
  await prisma.fightSceneAdminRating.upsert({
    where: { adminId_fightSceneId: { adminId: admin.id, fightSceneId: fightScene.id } },
    update: { score: 10, note: "The mirror room finale." },
    create: { adminId: admin.id, fightSceneId: fightScene.id, score: 10, note: "The mirror room finale." },
  });

  await prisma.editorialReview.upsert({
    where: { movieId: enterTheDragon.id },
    update: {},
    create: {
      movieId: enterTheDragon.id,
      authorId: admin.id,
      content:
        "Sample data: a genre-defining classic that still holds up. Bruce Lee's only Hollywood " +
        "co-production remains the gold standard for tournament-style kung fu films, anchored by " +
        "the mirror room finale — a masterclass in tension and choreography that's been studied " +
        "and imitated for fifty years.",
    },
  });

  const ipMan = await prisma.movie.findUniqueOrThrow({ where: { tmdbId: 900002 } });
  const drunkenMaster = await prisma.movie.findUniqueOrThrow({ where: { tmdbId: 900003 } });
  const memberList = await prisma.memberList.upsert({
    where: { userId_name: { userId: member.id, name: "Essential Kung Fu" } },
    update: {},
    create: {
      userId: member.id,
      name: "Essential Kung Fu",
      entries: {
        create: [{ movieId: enterTheDragon.id }, { movieId: ipMan.id }, { movieId: drunkenMaster.id }],
      },
    },
  });
  await prisma.memberListLike.upsert({
    where: { userId_listId: { userId: admin.id, listId: memberList.id } },
    update: {},
    create: { userId: admin.id, listId: memberList.id },
  });

  console.log("Seed complete.", { admin: admin.email, member: member.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
