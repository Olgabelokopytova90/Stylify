import db from "../db/connect";
import fs from "node:fs/promises";
import path from "node:path";
import openai from "../lib/openai";
import { buildAvatarPrompt } from "../utils/avatarPrompt";

import type {
  AvatarGeneration,
  AvatarGenerationStatus,
  LayoutPreset,
} from "../types/avatarGeneration";

type GenerateAvatarImageInput = {
  generationId: number;
  profile: {
    gender_presentation: string;
    body_shape: string;
    height_bucket: string;
    skin_tone: string;
    hair_style: string;
    hair_color: string;
    style_preferences: string[];
  };
};

type EditAvatarToBaseInput = {
  generationId: number;
  sourceImagePath: string;
};

function getImageFileMeta(sourceImagePath: string) {
  const ext = path.extname(sourceImagePath).toLowerCase();

  const mimeType =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
      ? "image/webp"
      : "image/png";

  const fileName =
    ext === ".jpg" || ext === ".jpeg"
      ? "source-image.jpg"
      : ext === ".webp"
      ? "source-image.webp"
      : "source-image.png";

  return { mimeType, fileName };
}

export async function editAvatarToBase({
  generationId,
  sourceImagePath,
}: EditAvatarToBaseInput) {
  const imageFile = await fs.readFile(sourceImagePath);
  const { mimeType, fileName } = getImageFileMeta(sourceImagePath);

  const prompt = `
Edit this image into a clean virtual try-on base avatar.

Keep exactly the same:
- person identity
- face
- hairstyle
- body proportions
- pose
- camera angle
- framing
- full-body composition
- front-facing symmetry

Change only the outfit.

Replace the current outfit with:
- a simple fitted neutral beige athletic tank top
- simple fitted neutral beige biker shorts
- barefoot
- no shoes
- no accessories
- no jewelry
- no jacket
- no jeans
- no skirt
- no outerwear

Requirements:
- full body visible from head to toes
- clean white background
- realistic polished computer-generated look
- no new props
- no background scene
- no crop
- no body rotation
- no perspective distortion
`.trim();

  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: new File([imageFile], fileName, { type: mimeType }),
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
    input_fidelity: "high",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI edit did not return image data");
  }

  const buffer = Buffer.from(b64, "base64");

  const outputDir = path.resolve(process.cwd(), "public", "generated-avatars");
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `avatar-${generationId}-base.png`;
  const filePath = path.join(outputDir, filename);

  await fs.writeFile(filePath, buffer);

  return {
    imageUrl: `/generated-avatars/${filename}`,
    prompt,
  };
}

export async function generateAvatarImage({
  generationId,
  profile,
}: {
  generationId: number;
  profile: any;
}) {
  // ⚠️ путь к фото пользователя (пока захардкодим для MVP)
  const uploadsDir = "public/uploads";

  let referenceImageBase64: string | null = null;

  try {
    const files = await fs.readdir(uploadsDir);

    if (files.length > 0) {
      const latestFile = files[files.length - 1];
      const filePath = `${uploadsDir}/${latestFile}`;

      const buffer = await fs.readFile(filePath);
      referenceImageBase64 = buffer.toString("base64");
    }
  } catch (e) {
    console.log("No uploaded photo found, fallback to default generation");
  }

  const prompt = `
Generate a full-body front-facing avatar for a virtual try-on application.

Keep pose strictly:
- standing straight
- arms close to body
- full body visible
- front-facing

Use facial features, hair, and general appearance from the reference image if provided.

Clothing:
- simple fitted beige athletic tank top
- fitted biker shorts
- barefoot
- no accessories

Background:
- clean white

Style:
- realistic, consistent proportions
- not stylized
`;

  const result = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt,
    size: "1024x1536",

  });

  const image = result.data?.[0];

  if (!image?.b64_json) {
    throw new Error("No image returned from OpenAI");
  }

  const buffer = Buffer.from(image.b64_json, "base64");

  const fileName = `avatar-${generationId}.png`;
  const filePath = `public/generated-avatars/${fileName}`;

  await fs.writeFile(filePath, buffer);

  return {
    imageUrl: `/generated-avatars/${fileName}`,
  };
}

export async function createAvatarGeneration(input: AvatarGeneration) {
  const query = `
    INSERT INTO avatar_generations (
      user_profile_id,
      prompt_version,
      model,
      status,
      image_url,
      layout_preset
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      user_profile_id,
      prompt_version,
      model,
      status,
      image_url,
      layout_preset,
      created_at,
      updated_at
  `;

  const values = [
    input.userProfileId,
    input.promptVersion,
    input.model,
    input.status,
    input.imageUrl ?? null,
    input.layoutPreset ?? null,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}

export async function getAvatarGenerationById(id: number) {
  const query = `
    SELECT
      id,
      user_profile_id,
      prompt_version,
      model,
      status,
      image_url,
      layout_preset,
      created_at,
      updated_at
    FROM avatar_generations
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);
  return result.rows[0] ?? null;
}

export async function getLatestAvatarGenerationByUserProfileId(
  userProfileId: number
) {
  const query = `
    SELECT
      id,
      user_profile_id,
      prompt_version,
      model,
      status,
      image_url,
      layout_preset,
      created_at,
      updated_at
    FROM avatar_generations
    WHERE user_profile_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await db.query(query, [userProfileId]);
  return result.rows[0] ?? null;
}

export async function updateAvatarGenerationById(
  id: number,
  updates: {
    status?: AvatarGenerationStatus;
    imageUrl?: string | null;
    layoutPreset?: LayoutPreset | null;
  }
) {
  const query = `
    UPDATE avatar_generations
    SET
      status = COALESCE($1, status),
      image_url = COALESCE($2, image_url),
      layout_preset = COALESCE($3, layout_preset),
      updated_at = NOW()
    WHERE id = $4
    RETURNING
      id,
      user_profile_id,
      prompt_version,
      model,
      status,
      image_url,
      layout_preset,
      created_at,
      updated_at
  `;

  const values = [
    updates.status ?? null,
    updates.imageUrl ?? null,
    updates.layoutPreset ?? null,
    id,
  ];

  const result = await db.query(query, values);
  return result.rows[0] ?? null;
}

export async function generateAvatarFromPhoto({
  generationId,
  sourceImagePath,
}: {
  generationId: number;
  sourceImagePath: string;
}) {
  const imageFile = await fs.readFile(sourceImagePath);
  const { mimeType, fileName } = getImageFileMeta(sourceImagePath);

  const prompt = `
Create a polished full-body digital avatar based on the person in this reference photo.

Preserve:
- facial identity
- hair color
- hair style
- overall likeness

Normalize into a consistent virtual try-on template:
- front-facing
- standing straight
- arms relaxed near the body
- full body visible
- symmetrical pose
- clean white studio background
- realistic computer-generated style

Wardrobe:
- modest neutral athletic outfit
- simple beige sleeveless top
- simple beige knee-length fitted shorts
- flat neutral footwear or bare feet if allowed by the model output
- no jewelry
- no jacket
- no jeans
- no skirt
- no accessories

Do not crop the body.
Do not rotate the pose.
Do not add props or scene elements.
Keep the result clean, modest, and suitable for a fashion technology application.
`.trim();

  const result = await openai.images.edit({
    model: "gpt-image-1.5",
    image: new File([imageFile], fileName, { type: mimeType }),
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
    input_fidelity: "high",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI edit did not return image data");
  }

  const buffer = Buffer.from(b64, "base64");

  const outputDir = path.resolve(process.cwd(), "public", "generated-avatars");
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `avatar-${generationId}-from-photo.png`;
  const filePath = path.join(outputDir, filename);

  await fs.writeFile(filePath, buffer);

  return {
    imageUrl: `/generated-avatars/${filename}`,
  };
}