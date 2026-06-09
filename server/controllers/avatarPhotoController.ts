import type { Request, Response, NextFunction, RequestHandler } from "express";
import db from "../db/connect";

interface AvatarPhotoController {
  uploadPhoto: RequestHandler;
}

const avatarPhotoController = {} as AvatarPhotoController;

avatarPhotoController.uploadPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    
    const userId = req.params.userId;

if (!userId) {
  return res.status(400).json({ error: "Invalid user id" });
}

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const updateQuery = `
  UPDATE profiles
  SET
    reference_photo_url = $1,
    updated_at = NOW()
  WHERE id = $2
  RETURNING
    id,
    display_name,
    body_type,
    fit_preference,
    onboarding_completed,
    reference_photo_url,
    created_at,
    updated_at
`;

    const { rows } = await db.query(updateQuery, [imageUrl, userId]);

    if (!rows.length) {
      return res.status(404).json({ error: "User profile not found" });
    }
console.log("uploadPhoto saved imageUrl:", imageUrl);
console.log("uploadPhoto updated profile reference_photo_url:", rows[0].reference_photo_url);

    return res.status(201).json({
      message: "Photo uploaded successfully",
      userId,
      filename: req.file.filename,
      imageUrl,
      profile: rows[0],
    });
  } catch (error) {
    return next({
      log: `uploadPhoto: ${error}`,
      status: 500,
      message: { err: "Failed to upload avatar photo" },
    });
  }
};

export default avatarPhotoController;