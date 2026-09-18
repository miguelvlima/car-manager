import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { homePath } from "@/lib/navigation";
import { getActor } from "@/server/permissions/check";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const actor = await getActor();
  if (!actor) redirect("/login");
  redirect(homePath(actor));
}
