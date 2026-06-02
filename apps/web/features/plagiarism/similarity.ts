const stopwords = new Set([
  "ada",
  "adalah",
  "agar",
  "akan",
  "atau",
  "dalam",
  "dan",
  "dari",
  "dengan",
  "di",
  "ini",
  "itu",
  "ke",
  "karena",
  "pada",
  "sebagai",
  "untuk",
  "yang",
]);

export function normalizeSubmissionText(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeSubmissionText(value: string) {
  return normalizeSubmissionText(value)
    .match(/[\p{L}\p{N}_$]+/gu)
    ?.filter((token) => token.length > 1 && !stopwords.has(token)) ?? [];
}

export function calculateJaccardSimilarity(left: string, right: string) {
  const leftTokens = new Set(tokenizeSubmissionText(left));
  const rightTokens = new Set(tokenizeSubmissionText(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersectionSize += 1;
    }
  }

  const unionSize = new Set([...leftTokens, ...rightTokens]).size;
  return Math.round((intersectionSize / unionSize) * 100);
}
