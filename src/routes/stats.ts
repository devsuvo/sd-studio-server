import { Router } from "express";
import { collections } from "../config/db";
import { asyncHandler } from "../utils/http";

const router = Router();

// GET /api/stats — public marketplace numbers for the home page
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const { studios, bookings } = await collections();
    const [studioCount, cities, hosts, bookingCount, categories] = await Promise.all([
      studios.countDocuments(),
      studios.distinct("city"),
      studios.distinct("hostId"),
      bookings.countDocuments({ status: { $in: ["pending", "confirmed"] } }),
      studios.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$category", count: { $sum: 1 } } }]).toArray(),
    ]);
    res.json({
      studios: studioCount,
      cities: cities.length,
      hosts: hosts.length,
      bookings: bookingCount,
      categories: Object.fromEntries(categories.map((c) => [c._id, c.count])),
    });
  }),
);

export default router;
