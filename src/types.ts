import type { ObjectId } from "mongodb";

export const CATEGORIES = [
  "Photography",
  "Film & Video",
  "Podcast",
  "Music Recording",
  "Art Workshop",
  "Dance & Rehearsal",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface StudioDoc {
  _id?: ObjectId;
  title: string;
  description: string;
  category: Category;
  city: string;
  address: string;
  hourlyRate: number;
  cleaningFee: number;
  capacity: number;
  sizeSqft: number;
  minHours: number;
  openHour: number;
  closeHour: number;
  amenities: string[];
  equipment: string[];
  images: string[];
  rules: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface BookingDoc {
  _id?: ObjectId;
  studioId: string;
  studio: { title: string; image: string; city: string; category: Category };
  hostId: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
  hours: number;
  pricing: { hourlyRate: number; subtotal: number; cleaningFee: number; serviceFee: number; total: number };
  note: string;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];
