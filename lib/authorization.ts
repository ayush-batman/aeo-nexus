export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceActor {
  role: WorkspaceRole;
}

export function requireWorkspaceRole(
  actor: WorkspaceActor,
  allowed: readonly WorkspaceRole[],
): boolean {
  return allowed.includes(actor.role);
}

export function normalizeWorkspaceRole(value: unknown): WorkspaceRole {
  return value === 'owner' || value === 'admin' || value === 'editor' || value === 'viewer'
    ? value
    : 'viewer';
}
