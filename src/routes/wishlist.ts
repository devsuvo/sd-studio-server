import { Router } from "express";
import { ObjectId } from "mongodb";
import { collections } from "../config/db";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, HttpError, toObjectId } from "../utils/http";

const router = Router();
router.use(requireAuth);

// GET /api/wishlist — saved studio ids plus the studio documents, newest save first
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { wishlists, studios } = await collections();
    const saved = await wishlists.find({ userId: req.user!.id }).sort({ createdAt: -1 }).toArray();
    const ids = saved.map((s) => s.studioId);
    const docs = await studios
      .find({ _id: { $in: ids.filter(ObjectId.isValid).map((id) => new ObjectId(id)) } })
      .toArray();
    // Keep the save order and drop studios that were deleted since.
    const byId = new Map(docs.map((d) => [d._id!.toString(), d]));
    res.json({ ids: ids.filter((id) => byId.has(id)), studios: ids.flatMap((id) => byId.get(id) ?? []) });
  }),
);

// POST /api/wishlist/:studioId — toggles a saved studio
router.post(
  "/:studioId",
  asyncHandler(async (req, res) => {
    const studioId = req.params.studioId;
    const { wishlists, studios } = await collections();
    if (!(await studios.countDocuments({ _id: toObjectId(studioId) }))) {
      throw new HttpError(404, "This studio no longer exists.");
    }
    const removed = await wishlists.deleteOne({ userId: req.user!.id, studioId });
    if (removed.deletedCount) {
      res.json({ saved: false });
      return;
    }
    await wishlists.updateOne(
      { userId: req.user!.id, studioId },
      { $setOnInsert: { userId: req.user!.id, studioId, createdAt: new Date() } },
      { upsert: true },
    );
    res.status(201).json({ saved: true });
  }),
);

export default router;
