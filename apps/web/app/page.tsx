import { redirect } from "next/navigation";

import { getCurrentProfile, getDashboardPathForRole } from "@/lib/auth";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "active") {
    redirect("/login");
  }

  redirect(getDashboardPathForRole(profile.role));
}
