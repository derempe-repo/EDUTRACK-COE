import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

import { profiles } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { z } from "@/lib/validators";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function dashboardPathForRole(role: "mahasiswa" | "dosen" | "admin" | "super_admin") {
  return {
    admin: "/admin/dashboard",
    dosen: "/dosen/dashboard",
    mahasiswa: "/mahasiswa/dashboard",
    super_admin: "/super-admin/dashboard",
  }[role];
}

export async function POST(request: Request) {
  const pendingCookies: Array<{
    name: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
    value: string;
  }> = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, options, value });
          });
        },
      },
    },
  );

  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    await writeAuditLog({
      action: "auth.login.invalid_input",
      metadata: {
        email: String(formData.get("email") ?? ""),
      },
    });
    return redirectTo(request, "/login?error=invalid_input");
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    const isEmailNotConfirmed =
      error?.code === "email_not_confirmed" ||
      error?.message.toLowerCase().includes("email not confirmed");

    await writeAuditLog({
      action: "auth.login.failed",
      metadata: {
        code: error?.code,
        email: parsed.data.email,
      },
    });
    return redirectTo(
      request,
      isEmailNotConfirmed ? "/login?error=email_not_confirmed" : "/login?error=invalid_credentials",
    );
  }

  const profile = (
    await db
      .select({
        email: profiles.email,
        id: profiles.id,
        role: profiles.role,
        status: profiles.status,
      })
      .from(profiles)
      .where(eq(profiles.id, data.user.id))
      .limit(1)
  )[0];

  if (!profile) {
    await writeAuditLog({
      action: "auth.login.profile_missing",
      metadata: {
        email: parsed.data.email,
      },
    });
    await supabase.auth.signOut();
    const redirectResponse = redirectTo(request, "/login?error=profile_not_found");
    pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options));
    return redirectResponse;
  }

  if (profile.status !== "active") {
    await writeAuditLog({
      action: "auth.login.inactive",
      metadata: {
        email: profile.email,
        profile_id: profile.id,
      },
    });
    await supabase.auth.signOut();
    const redirectResponse = redirectTo(request, "/login?error=inactive");
    pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options));
    return redirectResponse;
  }

  await writeAuditLog({
    action: "auth.login.succeeded",
    entityId: profile.id,
    entityType: "profiles",
    metadata: {
      email: profile.email,
      role: profile.role,
    },
  });

  const redirectResponse = redirectTo(request, dashboardPathForRole(profile.role));
  pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options));

  return redirectResponse;
}
