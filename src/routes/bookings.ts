import { Router } from "express";
import { collections } from "../config/db";
import { requireAuth } from "../middleware/auth";
import { ACTIVE_STATUSES, type BookingDoc, type BookingStatus } from "../types";
import { asyncHandler, earliestBookableDate, HttpError, toObjectId } from "../utils/http";
import { quote } from "../utils/pricing";
import { bookingCreateSchema, bookingStatusSchema } from "../utils/validators";

const router = Router();
router.use(requireAuth);

/** Confirmed sessions whose date has passed become "completed". Runs before reads so lists stay current. */
async function markCompleted() {
  const { bookings } = await collections();
  await bookings.updateMany(
    { status: "confirmed", date: { $lt: earliestBookableDate() } },
    { $set: { status: "completed", updatedAt: new Date() } },
  );
}

// POST /api/bookings — reserve a slot after checking hours and overlaps
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = bookingCreateSchema.parse(req.body);
    const user = req.user!;
    const { studios, bookings } = await collections();

    const studio = await studios.findOne({ _id: toObjectId(input.studioId) });
    if (!studio) throw new HttpError(404, "This studio no longer exists.");
    if (studio.hostId === user.id) throw new HttpError(400, "You can't book your own studio.");
    if (input.date < earliestBookableDate()) throw new HttpError(400, "Please pick a date that hasn't passed yet.");
    if (input.startHour < studio.openHour || input.endHour > studio.closeHour) {
      throw new HttpError(400, `This studio is open from ${studio.openHour}:00 to ${studio.closeHour}:00.`);
    }
    const hours = input.endHour - input.startHour;
    if (hours < studio.minHours) {
      throw new HttpError(400, `This studio needs at least ${studio.minHours} hour${studio.minHours > 1 ? "s" : ""} per booking.`);
    }

    const clash = await bookings.findOne({
      studioId: input.studioId,
      date: input.date,
      status: { $in: ACTIVE_STATUSES },
      startHour: { $lt: input.endHour },
      endHour: { $gt: input.startHour },
    });
    if (clash) {
      throw new HttpError(409, `That time overlaps an existing booking (${clash.startHour}:00–${clash.endHour}:00). Pick another slot.`);
    }

    const now = new Date();
    const doc: BookingDoc = {
      studioId: input.studioId,
      studio: { title: studio.title, image: studio.images[0] ?? "", city: studio.city, category: studio.category },
      hostId: studio.hostId,
      guestId: user.id,
      guestName: user.name,
      guestEmail: user.email,
      date: input.date,
      startHour: input.startHour,
      endHour: input.endHour,
      hours,
      pricing: quote(studio.hourlyRate, studio.securityDeposit, hours),
      note: input.note,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    const { insertedId } = await bookings.insertOne(doc);
    res.status(201).json({ ...doc, _id: insertedId });
  }),
);

// GET /api/bookings/me — bookings the user made as a guest
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    await markCompleted();
    const { bookings } = await collections();
    const items = await bookings.find({ guestId: req.user!.id }).sort({ date: -1, startHour: -1 }).toArray();
    res.json(items);
  }),
);

// GET /api/bookings/host — requests for studios the user hosts
router.get(
  "/host",
  asyncHandler(async (req, res) => {
    await markCompleted();
    const { bookings } = await collections();
    const items = await bookings.find({ hostId: req.user!.id }).sort({ createdAt: -1 }).toArray();
    res.json(items);
  }),
);

// GET /api/bookings/summary — numbers for the dashboard overview
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    await markCompleted();
    const userId = req.user!.id;
    const today = new Date().toISOString().slice(0, 10);
    const { bookings, studios } = await collections();

    const [asGuest, asHost, listings] = await Promise.all([
      bookings.find({ guestId: userId }).project<BookingDoc>({ status: 1, date: 1, pricing: 1 }).toArray(),
      bookings.find({ hostId: userId }).project<BookingDoc>({ status: 1, date: 1, pricing: 1 }).toArray(),
      studios.countDocuments({ ownerEmail: req.user!.email }),
    ]);

    const sum = (list: BookingDoc[], key: "total" | "subtotal") =>
      Math.round(list.reduce((t, b) => t + b.pricing[key], 0) * 100) / 100;
    const paid = (b: BookingDoc) => b.status === "confirmed" || b.status === "completed";
    const active = (b: BookingDoc) => ACTIVE_STATUSES.includes(b.status);

    res.json({
      bookings: asGuest.length,
      upcoming: asGuest.filter((b) => active(b) && b.date >= today).length,
      spent: sum(asGuest.filter(paid), "total"),
      listings,
      pendingRequests: asHost.filter((b) => b.status === "pending").length,
      // Hosts earn the hourly subtotal; the service fee goes to the platform and deposits are refundable.
      earnings: sum(asHost.filter(paid), "subtotal"),
    });
  }),
);

// PATCH /api/bookings/:id/status — guests cancel pending requests; hosts confirm / decline / cancel
router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = bookingStatusSchema.parse(req.body);
    const userId = req.user!.id;
    const { bookings } = await collections();
    const booking = await bookings.findOne({ _id: toObjectId(req.params.id) });
    if (!booking) throw new HttpError(404, "This booking no longer exists.");

    const isGuest = booking.guestId === userId;
    const isHost = booking.hostId === userId;
    if (!isGuest && !isHost) throw new HttpError(403, "You don't have access to this booking.");

    const allowed: Partial<Record<BookingStatus, BookingStatus[]>> = isHost
      ? { pending: ["confirmed", "declined"], confirmed: ["cancelled"] }
      : { pending: ["cancelled"] };

    if (isGuest && !isHost && booking.status === "confirmed") {
      throw new HttpError(400, "Confirmed bookings can only be cancelled by the host. Contact them by email.");
    }
    if (!allowed[booking.status]?.includes(status)) {
      throw new HttpError(400, `A ${booking.status} booking can't be changed to ${status}.`);
    }

    if (status === "confirmed") {
      const clash = await bookings.findOne({
        _id: { $ne: booking._id },
        studioId: booking.studioId,
        date: booking.date,
        status: "confirmed",
        startHour: { $lt: booking.endHour },
        endHour: { $gt: booking.startHour },
      });
      if (clash) throw new HttpError(409, "Another confirmed booking already holds this time.");
    }

    const updated = await bookings.findOneAndUpdate(
      { _id: booking._id, status: booking.status },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw new HttpError(409, "This booking was just updated. Refresh and try again.");
    res.json(updated);
  }),
);

export default router;
