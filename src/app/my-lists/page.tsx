import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// /my-lists now lives at /members/[username] (your own profile), so
// existing links/bookmarks to this URL still work.
export default async function MyListsRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my-lists");
  }
  redirect(`/members/${session.user.username}`);
}
