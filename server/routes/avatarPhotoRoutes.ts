import { Router } from "express";
import avatarPhotoController from "../controllers/avatarPhotoController";
import uploadAvatarPhoto from "../middleware/uploadAvatarPhoto";

const router = Router();

router.post(
  "/user/:userId/upload-photo",
  uploadAvatarPhoto.single("photo"),
  avatarPhotoController.uploadPhoto
);

export default router;