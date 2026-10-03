const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function newPublicId(): string {
  return crypto.randomUUID();
}

export function assertPublicId(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new Error('invalid_public_id');
  }
  return value;
}
