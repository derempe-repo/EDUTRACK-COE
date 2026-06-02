"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentProfile, getDashboardPathForRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getRegistrationsEnabled } from "@/features/admin/data";
import { createClient } from "@/lib/supabase/server";
import { z } from "@/lib/validators";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const registerSchema = z
  .object({
    confirmPassword: z.string().min(8),
    email: z.email(),
    name: z.string().trim().min(3).max(120),
    password: z.string().min(8).max(72),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

export async function registerMahasiswaAction(formData: FormData) {
  if (!(await getRegistrationsEnabled())) {
    redirect("/register?error=registration_disabled");
  }

  const parsed = registerSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    await writeAuditLog({
      action: "auth.register.invalid_input",
      metadata: {
        email: String(formData.get("email") ?? ""),
      },
    });
    redirect("/register?error=invalid_input");
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
      emailRedirectTo: `${origin}/auth/confirm?next=/mahasiswa/dashboard`,
    },
  });

  if (error) {
    const errorCode = error.code ?? "";
    const errorMessage = error.message.toLowerCase();
    const redirectError = errorCode.includes("over_email_send_rate_limit")
      ? "email_rate_limit"
      : errorCode.includes("email_address_invalid") || errorMessage.includes("email address")
        ? "invalid_email_address"
        : errorCode.includes("user_already_exists") || errorMessage.includes("already registered")
          ? "email_already_registered"
          : "register_failed";

    await writeAuditLog({
      action: "auth.register.failed",
      metadata: {
        code: error.code,
        email: parsed.data.email,
        message: error.message,
      },
    });
    redirect(`/register?error=${redirectError}`);
  }

  await writeAuditLog({
    action: "auth.register.succeeded",
    metadata: {
      email: parsed.data.email,
      role: "mahasiswa",
    },
  });

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?registered=1");
}

export async function loginAction(formData: FormData) {
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
    redirect("/login?error=invalid_input");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const isEmailNotConfirmed =
      error.code === "email_not_confirmed" ||
      error.message.toLowerCase().includes("email not confirmed");

    await writeAuditLog({
      action: "auth.login.failed",
      metadata: {
        code: error.code,
        email: parsed.data.email,
      },
    });
    redirect(isEmailNotConfirmed ? "/login?error=email_not_confirmed" : "/login?error=invalid_credentials");
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    await writeAuditLog({
      action: "auth.login.profile_missing",
      metadata: {
        email: parsed.data.email,
      },
    });
    await supabase.auth.signOut();
    redirect("/login?error=profile_not_found");
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
    redirect("/login?error=inactive");
  }

  await writeAuditLog({
    action: "auth.login.succeeded",
    entityType: "profiles",
    entityId: profile.id,
    metadata: {
      email: profile.email,
      role: profile.role,
    },
  });

  revalidatePath("/", "layout");
  redirect(getDashboardPathForRole(profile.role));
}

export async function logoutAction() {
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
  redirect("/login");
}
