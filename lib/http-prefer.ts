/** Parse the standard Prefer header without making option matching case-sensitive. */
export function prefersRespondAsync(headers: Pick<Headers, 'get'>): boolean {
  return (headers.get('prefer') ?? '')
    .split(',')
    .some((preference) => preference.trim().toLowerCase() === 'respond-async');
}
