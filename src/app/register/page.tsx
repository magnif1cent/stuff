import { headers } from "next/headers";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const nonce = (await headers()).get("x-nonce");
  return <RegisterForm nonce={nonce} />;
}
