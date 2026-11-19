import { Prisma } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { writeAudit } from './audit';
import { getRequestMeta, requireUser, type AuthUser } from './auth/session';
import { AppError, ForbiddenError, UnauthorizedError } from './errors';
import { assertCan, type Permission } from './rbac';

export { requireUser };

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export type RouteHandler = (request: NextRequest, context: RouteContext) => Promise<Response>;

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/** Uniform error mapping for every route handler. */
export function route(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.flatten() } },
          { status: 422 },
        );
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2021') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'DATABASE_SCHEMA_MISSING',
                message: 'The database tables are missing. Run the Prisma migration before using the portal.',
              },
            },
            { status: 503 },
          );
        }
        const status = error.code === 'P2002' ? 409 : error.code === 'P2025' ? 404 : 400;
        const message = error.code === 'P2002' ? 'A record with these details already exists' : 'Request could not be completed';
        return NextResponse.json({ success: false, error: { code: error.code, message } }, { status });
      }
      if (error instanceof Prisma.PrismaClientInitializationError) {
        const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());
        const prismaCode = (error as { errorCode?: string }).errorCode;
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: databaseUrlConfigured
                ? 'The database cannot be reached. Check the DATABASE_URL value and database firewall settings.'
                : 'DATABASE_URL is not set. Add the hosted PostgreSQL connection string in Vercel and redeploy.',
              details: prismaCode ? { prismaCode } : undefined,
            },
          },
          { status: 503 },
        );
      }
      if (error instanceof Error && error.message.startsWith('Missing required environment variable:')) {
        const name = error.message.replace('Missing required environment variable:', '').trim();
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SERVER_CONFIG_ERROR',
              message: `Server configuration is incomplete. Add ${name} to the Vercel environment variables and redeploy.`,
            },
          },
          { status: 503 },
        );
      }
      if (error instanceof AppError) {
        return NextResponse.json(
          { success: false, error: { code: error.code, message: error.message, details: error.details } },
          { status: error.status },
        );
      }
      console.error('[api] unexpected error', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
        { status: 500 },
      );
    }
  };
}

export async function requirePermission(permission: Permission): Promise<AuthUser> {
  const user = await requireUser();
  assertCan(user.role, permission);
  return user;
}

/** Logs denied access; call before throwing ForbiddenError in resource guards. */
export async function auditDenied(user: AuthUser | null, permission: string, entityType: string, entityId?: string) {
  if (!user) throw new UnauthorizedError();
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'PERMISSION_DENIED',
    entityType,
    entityId,
    metadata: { permission },
    ...(await getRequestMeta()),
  });
  throw new ForbiddenError();
}

export async function jsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError('Request body must be valid JSON', 400, 'BAD_REQUEST');
  }
}
