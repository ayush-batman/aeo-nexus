/** A failed or empty provider response is not a measured non-mention. */
export function hasUsableAnswer(row: { failure_code?: string | null; response: string }): boolean {
  return !row.failure_code && row.response.trim().length > 0;
}
