import { Router } from "express";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, HttpError } from "../utils/http";
import { uploadSchema } from "../utils/validators";

const router = Router();

// POST /api/uploads — forwards an image to imgbb so the API key never reaches the browser.
router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!env.imgbbKey) throw new HttpError(503, "Image uploads aren't set up yet. Paste an image URL instead.");
    const { image } = uploadSchema.parse(req.body);
    const base64 = image.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");

    const form = new URLSearchParams({ key: env.imgbbKey, image: base64 });
    const response = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
    const data = (await response.json().catch(() => null)) as
      | { success?: boolean; data?: { display_url?: string; url?: string }; error?: { message?: string } }
      | null;

    const url = data?.data?.display_url ?? data?.data?.url;
    if (!response.ok || !data?.success || !url) {
      throw new HttpError(502, data?.error?.message ?? "The image host rejected that file. Try a JPG or PNG under 5MB.");
    }
    res.status(201).json({ url });
  }),
);

export default router;
