import { z } from "zod";
import { CATEGORIES } from "../types";

const list = z.array(z.string().trim().min(1).max(80)).max(30);

const studioBase = z.object({
  title: z.string().trim().min(5, "must be at least 5 characters").max(100),
  description: z.string().trim().min(30, "must be at least 30 characters").max(3000),
  category: z.enum(CATEGORIES),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(160),
  hourlyRate: z.coerce.number().min(5, "must be at least $5").max(5000),
  securityDeposit: z.coerce.number().min(0).max(5000),
  capacity: z.coerce.number().int().min(1).max(500),
  sizeSqft: z.coerce.number().int().min(50).max(100000),
  minHours: z.coerce.number().int().min(1).max(12),
  openHour: z.coerce.number().int().min(0).max(23),
  closeHour: z.coerce.number().int().min(1).max(24),
  amenities: list,
  equipment: list,
  images: z.array(z.url("must be a valid URL")).min(1, "add at least one image").max(10),
  rules: z.string().trim().max(1500),
});

// Defaults only apply on create; on update, a missing field means "leave it unchanged".
const studioCreateBase = studioBase.extend({
  securityDeposit: studioBase.shape.securityDeposit.default(0),
  minHours: studioBase.shape.minHours.default(1),
  amenities: list.default([]),
  equipment: list.default([]),
  rules: studioBase.shape.rules.default(""),
});

const hoursCheck = (s: { openHour?: number; closeHour?: number; minHours?: number }) =>
  s.openHour === undefined || s.closeHour === undefined || s.closeHour - s.openHour >= (s.minHours ?? 1);

const hoursMessage = { message: "Closing time must leave room for the minimum booking length", path: ["closeHour"] };

export const studioCreateSchema = studioCreateBase.refine(hoursCheck, hoursMessage);
export const studioUpdateSchema = studioBase.partial().refine(hoursCheck, hoursMessage);

export const dateString = z
  .string({ error: "date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date in YYYY-MM-DD format")
  .refine((d) => !Number.isNaN(Date.parse(d)), "is not a real date");

export const bookingCreateSchema = z
  .object({
    studioId: z.string().min(1),
    date: dateString,
    startHour: z.coerce.number().int().min(0).max(23),
    endHour: z.coerce.number().int().min(1).max(24),
    note: z.string().trim().max(500).default(""),
  })
  .refine((b) => b.endHour > b.startHour, { message: "End time must be after start time", path: ["endHour"] });

export const bookingStatusSchema = z.object({
  status: z.enum(["confirmed", "declined", "cancelled"]),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "must be between 1 and 5").max(5, "must be between 1 and 5"),
  comment: z.string().trim().min(10, "must be at least 10 characters").max(1000),
});

export const uploadSchema = z.object({
  // Base64 image, with or without a data: URL prefix. ~7MB of base64 is about a 5MB file.
  image: z.string().min(100, "image is empty").max(7_000_000, "image must be 5MB or smaller"),
});
