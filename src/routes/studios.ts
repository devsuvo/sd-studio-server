import { Router } from "express";
import type { Filter, Sort } from "mongodb";
import { collections } from "../config/db";
import { requireAuth } from "../middleware/auth";
import { ACTIVE_STATUSES, CATEGORIES, type StudioDoc } from "../types";
import { asyncHandler, earliestBookableDate, escapeRegex, HttpError, toObjectId } from "../utils/http";
import { dateString, studioCreateSchema, studioUpdateSchema } from "../utils/validators";

const router = Router();

const SORTS: Record<string, Sort> = {
  newest: { createdAt: -1 },
  price_asc: { hourlyRate: 1 },
  price_desc: { hourlyRate: -1 },
  rating: { rating: -1, reviewCount: -1 },
};

// GET /api/studios — search, filter, sort and paginate
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const filter: Filter<StudioDoc> = {};

    if (q.search?.trim()) {
      const rx = new RegExp(escapeRegex(q.search.trim()), "i");
      filter.$or = [{ title: rx }, { city: rx }, { description: rx }, { amenities: rx }, { equipment: rx }];
    }
    if (q.category && (CATEGORIES as readonly string[]).includes(q.category)) {
      filter.category = q.category as StudioDoc["category"];
    }
    if (q.city?.trim()) filter.city = new RegExp(`^${escapeRegex(q.city.trim())}$`, "i");

    const price: { $gte?: number; $lte?: number } = {};
    const min = Number(q.minPrice);
    const max = Number(q.maxPrice);
    if (q.minPrice && !Number.isNaN(min)) price.$gte = min;
    if (q.maxPrice && !Number.isNaN(max)) price.$lte = max;
    if (Object.keys(price).length) filter.hourlyRate = price;

    const capacity = Number(q.capacity);
    if (q.capacity && capacity > 0) filter.capacity = { $gte: capacity };

    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(24, Math.max(1, Number(q.limit) || 9));
    const sort = SORTS[q.sort ?? "newest"] ?? SORTS.newest;

    const { studios } = await collections();
    const [items, total] = await Promise.all([
      studios.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).toArray(),
      studios.countDocuments(filter),
    ]);

    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

// GET /api/studios/featured — top rated spaces for the home page
router.get(
  "/featured",
  asyncHandler(async (_req, res) => {
    const { studios } = await collections();
    const items = await studios.find().sort({ rating: -1, reviewCount: -1 }).limit(6).toArray();
    res.json(items);
  }),
);

// GET /api/studios/cities — distinct cities for the filter dropdown
router.get(
  "/cities",
  asyncHandler(async (_req, res) => {
    const { studios } = await collections();
    const cities = (await studios.distinct("city")).sort();
    res.json(cities);
  }),
);

// GET /api/studios/mine — listings owned by the logged-in host
router.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { studios } = await collections();
    const items = await studios.find({ hostId: req.user!.id }).sort({ createdAt: -1 }).toArray();
    res.json(items);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { studios } = await collections();
    const studio = await studios.findOne({ _id: toObjectId(req.params.id) });
    if (!studio) throw new HttpError(404, "This studio no longer exists.");
    res.json(studio);
  }),
);

// GET /api/studios/:id/availability?date=YYYY-MM-DD — hours already held by active bookings
router.get(
  "/:id/availability",
  asyncHandler(async (req, res) => {
    const date = dateString.parse(req.query.date);
    const { studios, bookings } = await collections();
    const studio = await studios.findOne(
      { _id: toObjectId(req.params.id) },
      { projection: { openHour: 1, closeHour: 1, minHours: 1 } },
    );
    if (!studio) throw new HttpError(404, "This studio no longer exists.");

    const booked = await bookings
      .find({ studioId: req.params.id, date, status: { $in: ACTIVE_STATUSES } })
      .project<{ startHour: number; endHour: number; status: string }>({ startHour: 1, endHour: 1, status: 1, _id: 0 })
      .sort({ startHour: 1 })
      .toArray();

    res.json({
      date,
      openHour: studio.openHour,
      closeHour: studio.closeHour,
      minHours: studio.minHours,
      bookable: date >= earliestBookableDate(),
      booked,
    });
  }),
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = studioCreateSchema.parse(req.body);
    const now = new Date();
    const doc: StudioDoc = {
      ...data,
      hostId: req.user!.id,
      hostName: req.user!.name,
      hostEmail: req.user!.email,
      rating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const { studios } = await collections();
    const { insertedId } = await studios.insertOne(doc);
    res.status(201).json({ ...doc, _id: insertedId });
  }),
);

async function findOwned(id: string, userId: string) {
  const { studios } = await collections();
  const studio = await studios.findOne({ _id: toObjectId(id) });
  if (!studio) throw new HttpError(404, "This studio no longer exists.");
  if (studio.hostId !== userId) throw new HttpError(403, "Only the host of this studio can change it.");
  return studio;
}

router.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = await findOwned(req.params.id, req.user!.id);
    const updates = studioUpdateSchema.parse(req.body);
    const merged = { ...current, ...updates };
    if (merged.closeHour - merged.openHour < merged.minHours) {
      throw new HttpError(400, "Closing time must leave room for the minimum booking length");
    }
    const { studios } = await collections();
    const updated = await studios.findOneAndUpdate(
      { _id: current._id },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    res.json(updated);
  }),
);

router.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const studio = await findOwned(req.params.id, req.user!.id);
    const { studios, bookings } = await collections();
    const upcoming = await bookings.countDocuments({
      studioId: req.params.id,
      status: { $in: ACTIVE_STATUSES },
      date: { $gte: earliestBookableDate() },
    });
    if (upcoming > 0) {
      throw new HttpError(
        409,
        `This studio has ${upcoming} upcoming booking${upcoming > 1 ? "s" : ""}. Cancel or decline them before deleting.`,
      );
    }
    await studios.deleteOne({ _id: studio._id });
    res.json({ message: "Studio deleted" });
  }),
);

export default router;
