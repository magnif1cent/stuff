import { headers } from "next/headers";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const nonce = (await headers()).get("x-nonce");
  return <ForgotPasswordForm nonce={nonce} />;
}
