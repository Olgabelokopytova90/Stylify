import db from "../db/connect";
import path from "node:path";
import type { Request, Response, NextFunction, RequestHandler } from "express";

import {
  createAvatarGeneration,
  getAvatarGenerationById,
  getLatestAvatarGenerationByUserProfileId,
  updateAvatarGenerationById,
  generateAvatarFromPhoto,
} from "../services/avatarGenerationService";

import { getUserProfileByUserId } from "../services/userProfileService";

type BodyType = "rectangle" | "pear" | "hourglass" | "apple";

function isBodyType(value: unknown): value is BodyType {
  return ["rectangle", "pear", "hourglass", "apple"].includes(value as string);
}

function mapBodyShapeToLayoutPreset(bodyShape: string) {
  const s = String(bodyShape ?? "").toLowerCase();
  if (s === "pear" || s === "hourglass") return "curvy";
  return "average";
}

interface AvatarGenerationController {
  createAvatar: RequestHandler;
  getAvatarById: RequestHandler;
  getLatestAvatarByUserId: RequestHandler;
  generateAvatarFromPhoto: RequestHandler;
}

const avatarGenerationController = {} as AvatarGenerationController;

avatarGenerationController.createAvatar = async (
  req: Request, res: Response, next: NextFunction
) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const profile = await getUserProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    const avatar = await createAvatarGeneration({
      userProfileId: profile.id,
      promptVersion: "v1",
      model: "deterministic-v1",
      status: "pending",
      imageUrl: null,
      layoutPreset: mapBodyShapeToLayoutPreset(profile.body_shape),
    });
    return res.status(201).json(avatar);
  } catch (error) {
    return next({ log: `createAvatar: ${error}`, status: 500, message: { err: "Failed to create avatar" } });
  }
};

avatarGenerationController.generateAvatarFromPhoto = async (
  req: Request, res: Response, next: NextFunction
) => {
  try {
    const avatarId = Number(req.params.id);
    if (!Number.isFinite(avatarId) || avatarId <= 0) {
      return res.status(400).json({ error: "Invalid avatar generation id" });
    }

    const { bodyType } = req.body as { bodyType?: unknown };
    if (!isBodyType(bodyType)) {
      return res.status(400).json({ error: "Invalid bodyType. Must be: rectangle | pear | hourglass | apple" });
    }

    const avatar = await getAvatarGenerationById(avatarId);
    if (!avatar) {
      return res.status(404).json({ error: "Avatar generation not found" });
    }

    const profileResult = await db.query(
      `SELECT id, reference_photo_url FROM user_profiles WHERE id = $1`,
      [avatar.user_profile_id]
    );
    const profile = profileResult.rows[0];

    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    if (!profile.reference_photo_url) {
      return res.status(400).json({ error: "No reference photo found. Please upload a photo first." });
    }

    const sourceImagePath = path.resolve(
      process.cwd(), "public",
      profile.reference_photo_url.replace(/^\//, "")
    );

    await updateAvatarGenerationById(avatarId, { status: "processing" as any });

    const generated = await generateAvatarFromPhoto({
      generationId: avatarId,
      sourceImagePath,
      bodyType,
    });

    const updated = await updateAvatarGenerationById(avatarId, {
      status: "ready",
      imageUrl: generated.imageUrl,
      layoutPreset: avatar.layout_preset,
    });

    return res.status(200).json({
      ...updated,
      skinToneHex: generated.skinToneHex,
    });

  } catch (error) {
    const avatarId = Number(req.params.id);
    if (Number.isFinite(avatarId)) {
      await updateAvatarGenerationById(avatarId, { status: "failed" as any }).catch(() => {});
    }
    return next({ log: `generateAvatarFromPhoto: ${error}`, status: 500, message: { err: String(error) } });
  }
};

avatarGenerationController.getAvatarById = async (
  req: Request, res: Response, next: NextFunction
) => {
  try {
    const avatarId = Number(req.params.id);
    if (!Number.isFinite(avatarId) || avatarId <= 0) {
      return res.status(400).json({ error: "Invalid avatar generation id" });
    }
    const avatar = await getAvatarGenerationById(avatarId);
    if (!avatar) {
      return res.status(404).json({ error: "Avatar generation not found" });
    }
    return res.status(200).json(avatar);
  } catch (error) {
    return next({ log: `getAvatarById: ${error}`, status: 500, message: { err: "Failed to fetch avatar" } });
  }
};

avatarGenerationController.getLatestAvatarByUserId = async (
  req: Request, res: Response, next: NextFunction
) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const profile = await getUserProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    const avatar = await getLatestAvatarGenerationByUserProfileId(profile.id);
    if (!avatar) {
      return res.status(404).json({ error: "No avatar generation found" });
    }
    return res.status(200).json(avatar);
  } catch (error) {
    return next({ log: `getLatestAvatarByUserId: ${error}`, status: 500, message: { err: "Failed to fetch avatar" } });
  }
};

export default avatarGenerationController;
