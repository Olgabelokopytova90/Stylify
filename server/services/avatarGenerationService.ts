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

export async function editAvatarToBase({
  generationId,
  sourceImagePath,
}: EditAvatarToBaseInput) {
  const imageFile = await fs.readFile(sourceImagePath);

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
    image: new File([imageFile], "source-avatar.png", { type: "image/png" }),
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
}: GenerateAvatarImageInput) {
  const prompt = buildAvatarPrompt({
    genderPresentation: profile.gender_presentation,
    bodyShape: profile.body_shape,
    heightBucket: profile.height_bucket,
    skinTone: profile.skin_tone,
    hairStyle: profile.hair_style,
    hairColor: profile.hair_color,
    stylePreferences: profile.style_preferences ?? [],
  });

  const result = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI did not return image data");
  }

  const buffer = Buffer.from(b64, "base64");

  const outputDir = path.resolve(process.cwd(), "public", "generated-avatars");
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `avatar-${generationId}.png`;
  const filePath = path.join(outputDir, filename);

  await fs.writeFile(filePath, buffer);

  return {
    imageUrl: `/generated-avatars/${filename}`,
    prompt,
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