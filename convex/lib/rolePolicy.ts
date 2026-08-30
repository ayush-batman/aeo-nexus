export type TenantRole = 'owner' | 'admin' | 'editor' | 'viewer';

const ROLE_LEVEL: Record<TenantRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export function roleAllows(actual: TenantRole, required: TenantRole): boolean {
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}

export function assertRole(actual: TenantRole, required: TenantRole): void {
  if (!roleAllows(actual, required)) {
    throw new Error('forbidden_role');
  }
}
