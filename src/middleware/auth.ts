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

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Please log in to continue." });
    return;
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks);
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
