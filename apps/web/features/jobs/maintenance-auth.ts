type JobAuthInput = {
  authorizationHeader: string | null;
  configuredSecret?: string;
  dryRun: boolean;
  nodeEnv?: string;
  secretHeader: string | null;
};

export function isMaintenanceJobAuthorized({
  authorizationHeader,
  configuredSecret,
  dryRun,
  nodeEnv,
  secretHeader,
}: JobAuthInput) {
  const secret = configuredSecret?.trim();

  if (!secret) {
    return nodeEnv !== "production" && dryRun;
  }

  const bearerToken = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length).trim()
    : null;

  return bearerToken === secret || secretHeader === secret;
}

export function readPositiveIntegerSetting(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}
