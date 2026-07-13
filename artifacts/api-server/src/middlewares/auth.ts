import { type NextFunction, type Request, type Response } from "express";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const now = new Date();

  const rows = await db
    .select({
      session: sessionsTable,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileUpdatedAt: usersTable.profileUpdatedAt,
        createdAt: usersTable.createdAt,
      },
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.token, token),
        gt(sessionsTable.expiresAt, now)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Attach user + token to request for downstream handlers
  (req as any).currentUser = rows[0].user;
  (req as any).sessionToken = token;
  next();
}

/**
 * Like requireAuth, but never blocks the request. If a valid Bearer token is
 * present, attaches `currentUser`/`sessionToken` to the request; otherwise
 * continues unauthenticated. Use for public endpoints whose response shape
 * changes when a caller happens to be logged in (e.g. feed like/bookmark state).
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const now = new Date();

  const rows = await db
    .select({
      session: sessionsTable,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        profileUpdatedAt: usersTable.profileUpdatedAt,
        createdAt: usersTable.createdAt,
      },
    })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
    .where(
      and(
        eq(sessionsTable.token, token),
        gt(sessionsTable.expiresAt, now)
      )
    )
    .limit(1);

  if (rows.length > 0) {
    (req as any).currentUser = rows[0].user;
    (req as any).sessionToken = token;
  }

  next();
}
