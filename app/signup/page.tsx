// app/signup/page.tsx (SERVER)
import { redirect } from "next/navigation";
import { getCurrentChurchSession } from "@/src/lib/auth";
import SignupForm from "./SignupForm";

export default async function SignupPage() {
  const session = await getCurrentChurchSession();

  // ✅ If already logged in, kick them to their dashboard
  if (session?.slug) {
    redirect(`/${session.slug}/admin`);
  }

  // Otherwise show signup form
  return <SignupForm />;
}
