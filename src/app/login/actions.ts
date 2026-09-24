"use server";

import { AuthError } from "next-auth";
import { signIn, EmailNotVerifiedSignInError } from "@/lib/auth";

export interface LoginActionState {
  message: string;
  // Set only for the unverified-account case, so the form can offer a
  // "resend verification email" affordance instead of just an error string.
  // Carries the submitted email back to the client, which otherwise has no
  // access to it — the input isn't controlled state, just plain FormData.
  unverifiedEmail?: string;
}

export async function authenticate(
  _prevState: LoginActionState | undefined,
  formData: FormData,
): Promise<LoginActionState | undefined> {
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
    if (error instanceof EmailNotVerifiedSignInError) {
      return {
        message: "Verify your email before signing in.",
        unverifiedEmail: typeof formData.get("email") === "string" ? (formData.get("email") as string) : undefined,
      };
    }
    if (error instanceof AuthError) {
      return { message: "Invalid email or password." };
    }
    throw error;
  }
}
