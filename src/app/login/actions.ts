"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function authenticate(_prevState: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (error) {
    // signIn() redirects internally on success by throwing Next's special
    // NEXT_REDIRECT error — that must propagate, not be swallowed here, or
    // the browser never navigates. Only an actual auth failure (AuthError)
    // should turn into a returned message instead.
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }
}
