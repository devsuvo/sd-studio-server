import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ObjectId } from "mongodb";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new HttpError(404, "We couldn't find what you were looking for.");
  return new ObjectId(id);
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Today's date as YYYY-MM-DD, shifted back a day so clients in any timezone can book "today". */
export function earliestBookableDate(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
