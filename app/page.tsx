import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
  return null; // This won't render anything since the user is redirected
}
