import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (profile) {
    await writeAuditLog({
      action: "auth.logout.succeeded",
      entityType: "profiles",
      entityId: profile.id,
      metadata: {
        email: profile.email,
        role: profile.role,
      },
    });
  }

  await supabase.auth.signOut();

  revalidatePath("/", "layout");

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  });
}
