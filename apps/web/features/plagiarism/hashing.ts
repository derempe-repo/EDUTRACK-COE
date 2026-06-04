import { createHash } from "node:crypto";

export async function hashFileContent(file: Pick<File, "arrayBuffer">) {
  return hashBytes(new Uint8Array(await file.arrayBuffer()));
}

export function hashTextContent(text: string) {
  return text ? createHash("sha256").update(text, "utf8").digest("hex") : null;
}

export function hashBytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
