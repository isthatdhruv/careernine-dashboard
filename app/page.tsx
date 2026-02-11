import { redirect } from "next/navigation";

export default function Home() {
  redirect("/admin/dashboard");
  return null; // This won't render anything since the user is redirected
}
