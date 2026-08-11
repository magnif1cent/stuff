import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Kung Fu Movie DB",
  description: "What Kung Fu Movie DB is, how the catalog is curated, and how to reach an admin.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-serif text-2xl font-bold text-white">About</h1>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">What this site is</h2>
        <p className="text-sm leading-relaxed text-neutral-300">Under construction.</p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">How the catalog is curated</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          Every movie in the catalog comes from{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="text-red-400 hover:text-red-300"
          >
            TMDB
          </a>
          , but TMDB has no single &ldquo;kung fu&rdquo; genre to filter by. Rather than an automated import
          trying to guess what counts, admins search and hand-pick titles — by name or by keyword (like
          &ldquo;kung fu&rdquo; or &ldquo;martial arts&rdquo;, optionally narrowed by country of origin) — before
          a film is added to the catalog. That means the catalog grows deliberately rather than automatically,
          so a missing title is a curation gap, not a bug. If you can&apos;t find a movie you&apos;re looking
          for, you can submit it for admin review directly from the search page.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">Contact &amp; feedback</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          Spotted a bug, have a feature idea, or found something in the catalog or a discussion that needs an
          admin&apos;s attention? The best way to reach an admin is by email — a contact address will be added
          here.
        </p>
      </section>

      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-white">Community guidelines</h2>
        <p className="mb-3 text-sm leading-relaxed text-neutral-300">
          Discussion posts and fight scene submissions are member-contributed, and admins moderate them. Keep it
          simple:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-neutral-300">
          <li>
            <span className="font-medium text-neutral-100">Be respectful.</span>{" "}
            Disagree about movies and fight choreography all you want — no harassment, hate speech, or personal
            attacks.
          </li>
          <li>
            <span className="font-medium text-neutral-100">Stay on topic.</span>{" "}
            Discussion threads are for the movie they&apos;re attached to; fight scene tags are for real,
            relevant clips from that film.
          </li>
          <li>
            <span className="font-medium text-neutral-100">Tag spoilers.</span>{" "}
            Wrap plot-critical spoilers in{" "}
            <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-xs">
              [spoiler]...[/spoiler]
            </code>{" "}
            so other visitors can choose when to read them.
          </li>
          <li>
            <span className="font-medium text-neutral-100">Submit real fight scenes.</span>{" "}
            Clips should actually be from the movie&apos;s cast and correctly tagged — not unrelated videos,
            fan edits, or duplicates of a scene that&apos;s already tagged.
          </li>
          <li>
            <span className="font-medium text-neutral-100">No spam or self-promotion.</span>{" "}
            Keep posts and submissions about the movie or scene, not about driving traffic elsewhere.
          </li>
          <li>
            <span className="font-medium text-neutral-100">Don&apos;t impersonate anyone.</span>{" "}
            Usernames should identify you, not someone else — real actors, other members, or admins.
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
          Admins can edit or remove content that breaks these guidelines. Repeated violations may result in
          losing posting privileges.
        </p>
      </section>
    </div>
  );
}
