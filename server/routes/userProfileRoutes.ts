import { Router } from "express";
import userProfileController from "../controllers/userProfileController";

const router = Router();

router.post("/:userId", userProfileController.createProfile);
router.get("/:userId", userProfileController.getProfileByUserId);
router.patch("/:userId", userProfileController.updateProfileByUserId);
router.delete("/:userId", userProfileController.deleteProfileByUserId);

export default router;