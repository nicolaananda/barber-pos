import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Redirect based on role
  if (session.user.role === 'staff') {
    redirect('/pos');
  }

  redirect('/dashboard');
}
