import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

type AuditMetadata = Record<string, unknown>;

type WriteAuditLogInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: AuditMetadata;
};

export async function writeAuditLog({
  action,
  entityType,
  entityId,
  metadata,
}: WriteAuditLogInput) {
  const headerStore = await headers();
  const supabase = await createClient();

  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip");
  const userAgent = headerStore.get("user-agent");

  const { error } = await supabase.rpc("log_audit_event", {
    p_action: action,
    p_entity_type: entityType ?? null,
    p_entity_id: entityId ?? null,
    p_metadata: metadata ?? {},
    p_ip_address: ipAddress ?? null,
    p_user_agent: userAgent ?? null,
  });

  if (error) {
    console.error("Failed to write audit log", {
      action,
      code: error.code,
      message: error.message,
    });
  }
}
