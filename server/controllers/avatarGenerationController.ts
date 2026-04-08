import path from "node:path";
import { editAvatarToBase as editAvatarToBaseService } from "../services/avatarGenerationService";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  createAvatarGeneration,
  getAvatarGenerationById,
  getLatestAvatarGenerationByUserProfileId,
  updateAvatarGenerationById,
} from "../services/avatarGenerationService";
import { getUserProfileByUserId } from "../services/userProfileService";

import { generateAvatarImage } from "../services/avatarGenerationService";

interface AvatarGenerationController {
  createAvatar: RequestHandler;
  getAvatarById: RequestHandler;
  getLatestAvatarByUserId: RequestHandler;
  generateAvatarWithAI: RequestHandler;
  editAvatarToBase: RequestHandler;
}


const avatarGenerationController = {} as AvatarGenerationController;

function mapBodyShapeToLayoutPreset(bodyShape: string) {
  const normalized = String(bodyShape ?? "").toLowerCase();

  if (normalized === "rectangle") return "average";
  if (normalized === "pear") return "curvy";
  if (normalized === "hourglass") return "curvy";
  if (normalized === "apple") return "average";

  return "average";
}

avatarGenerationController.createAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
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
      model: "gpt-image-1.5",
      status: "pending",
      imageUrl: null,
      layoutPreset: mapBodyShapeToLayoutPreset(profile.body_shape),
    });

    return res.status(201).json(avatar);
  } catch (error) {
    return next({
      log: `createAvatar: ${error}`,
      status: 500,
      message: { err: "Failed to create avatar generation" },
    });
  }
};

avatarGenerationController.editAvatarToBase = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    if (!avatar.image_url) {
      return res.status(400).json({ error: "Source avatar has no image_url" });
    }

    const sourcePath = path.resolve(
      process.cwd(),
      "public",
      avatar.image_url.replace(/^\//, "")
    );

    const edited = await editAvatarToBaseService({
      generationId: avatarId,
      sourceImagePath: sourcePath,
    });

    const updated = await updateAvatarGenerationById(avatarId, {
      status: "ready",
      imageUrl: edited.imageUrl,
      layoutPreset: avatar.layout_preset,
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next({
      log: `editAvatarToBase: ${error}`,
      status: 500,
      message: { err: "Failed to edit avatar into base template" },
    });
  }
};


avatarGenerationController.generateAvatarWithAI = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    const created = await createAvatarGeneration({
      userProfileId: profile.id,
      promptVersion: "v1",
      model: "gpt-image-1.5",
      status: "pending",
      imageUrl: null,
      layoutPreset: mapBodyShapeToLayoutPreset(profile.body_shape),
    });

    const generated = await generateAvatarImage({
      generationId: created.id,
      profile,
    });

    const updated = await updateAvatarGenerationById(created.id, {
      status: "ready",
      imageUrl: generated.imageUrl,
      layoutPreset: created.layout_preset,
    });

    return res.status(201).json(updated);
  } catch (error) {
    return next({
      log: `generateAvatarWithAI: ${error}`,
      status: 500,
      message: { err: "Failed to generate avatar with AI" },
    });
  }
};

avatarGenerationController.getAvatarById = async (
  req: Request,
  res: Response,
  next: NextFunction
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
    return next({
      log: `getAvatarById: ${error}`,
      status: 500,
      message: { err: "Failed to fetch avatar generation" },
    });
  }
};

avatarGenerationController.getLatestAvatarByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
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
    return next({
      log: `getLatestAvatarByUserId: ${error}`,
      status: 500,
      message: { err: "Failed to fetch latest avatar generation" },
    });
  }
};

export default avatarGenerationController;