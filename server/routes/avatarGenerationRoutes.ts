import { Router } from "express";
import avatarGenerationController from "../controllers/avatarGenerationController";
import openai from "../lib/openai";
import fs from "fs/promises";
import path from "path";

const router = Router();

router.get("/test-ai", async (_req: any, res: any) => {
  try {
    const result = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: "A simple full body fashion model, neutral pose",
      size: "1024x1536",
    });

    const image = result.data?.[0];

    if (!image?.b64_json) {
      return res.status(500).json({ error: "No image returned" });
    }

    const buffer = Buffer.from(image.b64_json, "base64");

    const outputDir = path.resolve("public/generated-avatars");
    await fs.mkdir(outputDir, { recursive: true });

    const filePath = path.join(outputDir, "test-avatar.png");

    await fs.writeFile(filePath, buffer);

    return res.json({
      message: "Image generated",
      url: "/generated-avatars/test-avatar.png",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI failed" });
  }
});

// create avatar_generation record only
router.post("/user/:userId", avatarGenerationController.createAvatar);

// real AI generation
router.post(
  "/user/:userId/generate",
  avatarGenerationController.generateAvatarWithAI
);

// latest by user
router.get(
  "/user/:userId/latest",
  avatarGenerationController.getLatestAvatarByUserId
);

// edit existing generation
router.post("/:id/edit-base", avatarGenerationController.editAvatarToBase);

// get by id — dynamic route should stay last
router.get("/:id", avatarGenerationController.getAvatarById);

export default router;