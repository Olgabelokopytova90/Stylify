import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  createUserProfile,
  getUserProfileByUserId,
  updateUserProfileByUserId,
  deleteUserProfileByUserId,
} from "../services/userProfileService";

interface UserProfileController {
  createProfile: RequestHandler;
  getProfileByUserId: RequestHandler;
  updateProfileByUserId: RequestHandler;
  deleteProfileByUserId: RequestHandler;
}

const userProfileController = {} as UserProfileController;

userProfileController.createProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const existing = await getUserProfileByUserId(userId);
    if (existing) {
      return res.status(409).json({ error: "User profile already exists" });
    }

    const {
      genderPresentation,
      bodyShape,
      heightBucket,
      skinTone,
      hairStyle,
      hairColor,
      stylePreferences,
      occasionPreferences,
      avatarImageUrl,
    } = req.body ?? {};

    if (
      !genderPresentation ||
      !bodyShape ||
      !heightBucket ||
      !skinTone ||
      !hairStyle ||
      !hairColor ||
      !Array.isArray(stylePreferences)
    ) {
      return res.status(400).json({ error: "Missing or invalid profile fields" });
    }

    const profile = await createUserProfile(userId, {
      genderPresentation,
      bodyShape,
      heightBucket,
      skinTone,
      hairStyle,
      hairColor,
      stylePreferences,
      occasionPreferences,
      avatarImageUrl,
    });

    return res.status(201).json(profile);
  } catch (error) {
    return next({
      log: `createProfile: ${error}`,
      status: 500,
      message: { err: "Failed to create user profile" },
    });
  }
};

userProfileController.getProfileByUserId = async (
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

    return res.status(200).json(profile);
  } catch (error) {
    return next({
      log: `getProfileByUserId: ${error}`,
      status: 500,
      message: { err: "Failed to fetch user profile" },
    });
  }
};

userProfileController.updateProfileByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const updated = await updateUserProfileByUserId(userId, req.body ?? {});

    if (!updated) {
      return res.status(404).json({ error: "User profile not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return next({
      log: `updateProfileByUserId: ${error}`,
      status: 500,
      message: { err: "Failed to update user profile" },
    });
  }
};

userProfileController.deleteProfileByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const deleted = await deleteUserProfileByUserId(userId);

    if (!deleted) {
      return res.status(404).json({ error: "User profile not found" });
    }

    return res.status(200).json({
      message: "User profile deleted successfully",
      deletedProfile: deleted,
    });
  } catch (error) {
    return next({
      log: `deleteProfileByUserId: ${error}`,
      status: 500,
      message: { err: "Failed to delete user profile" },
    });
  }
};

export default userProfileController;