import { Router } from "express";
import avatarGenerationController from "../controllers/avatarGenerationController";

const router = Router();

// Создать запись аватара
router.post("/user/:userId", avatarGenerationController.createAvatar);

// Сгенерировать аватар из фото
router.post("/:id/generate-from-photo", avatarGenerationController.generateAvatarFromPhoto);

// Последний аватар юзера
router.get("/user/:userId/latest", avatarGenerationController.getLatestAvatarByUserId);

// Получить по id — всегда последним
router.get("/:id", avatarGenerationController.getAvatarById);

export default router;
