import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { getCurrentUser, type AuthUser } from './auth/session';
import { can, type Permission } from './rbac';

/** Server-side page guard. API routes repeat these checks independently. */
export async function requirePage(options: { permission?: Permission; roles?: Role[] } = {}): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (options.roles && !options.roles.includes(user.role)) redirect('/unauthorized');
  if (options.permission && !can(user.role, options.permission)) redirect('/unauthorized');
  return user;
}
