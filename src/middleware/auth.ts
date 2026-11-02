import type { RequestHandler } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// BetterAuth's JWT plugin on the Next.js client publishes its public keys here.
const jwks = createRemoteJWKSet(new URL(`${env.clientUrl}/api/auth/jwks`));

/** Name of the HttpOnly cookie the Next.js client sets with the user's JWT. */
export const TOKEN_COOKIE = "ss_token";

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Protects mutations and private reads. The JWT comes from the HttpOnly `ss_token` cookie
 * (browser traffic) or a Bearer header (scripts/tools). Anything else gets 401 Unauthorized.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : readCookie(req.headers.cookie, TOKEN_COOKIE);
  if (!token) {
    res.status(401).json({ message: "Please log in to continue." });
    return;
  }
  try {
    const { payload } = await jwtVerify(token, jwks);
    const id = String(payload.sub ?? payload.id ?? "");
    if (!id) throw new Error("Token has no subject");
    req.user = {
      id,
      name: String(payload.name ?? "Creator"),
      email: String(payload.email ?? ""),
      image: (payload.image as string | null | undefined) ?? null,
    };
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
};
