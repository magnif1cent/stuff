import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/verification";
import { MovieSubmissionSearch } from "@/components/movie-submission-search";

export default async function SubmitMoviePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/movies/submit");
  }
  const verified = await isEmailVerified(session.user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-white">Add a movie</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Search TMDB for a movie that&rsquo;s missing from the catalog. It won&rsquo;t appear on the site
        until an admin reviews and approves it.
      </p>
      {verified ? (
        <MovieSubmissionSearch />
      ) : (
        <p className="text-sm text-amber-400">Verify your email before submitting a movie.</p>
      )}
    </div>
  );
}
