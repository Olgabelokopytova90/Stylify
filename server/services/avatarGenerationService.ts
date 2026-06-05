import db from "../db/connect";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { toFile } from "openai/uploads";
import openai from "../lib/openai";

import type {
  AvatarGeneration,
  AvatarGenerationStatus,
  LayoutPreset,
} from "../types/avatarGeneration";

type BodyType = "rectangle" | "pear" | "hourglass" | "apple";

function getBodyDescription(bodyType: BodyType) {
  switch (bodyType) {
    case "apple":
      return "apple body shape: fuller midsection, softer waist definition, balanced legs";
    case "pear":
      return "pear body shape: narrower shoulders, fuller hips and thighs";
    case "hourglass":
      return "hourglass body shape: balanced shoulders and hips with defined waist";
    case "rectangle":
      return "rectangle body shape: balanced shoulders, waist, and hips with a straighter silhouette";
    default:
      return "natural balanced body shape";
  }
}

function buildFullBodyAvatarPrompt(bodyType: BodyType) {
  return `
Transform this uploaded user photo into a standardized realistic full-body avatar for a virtual try-on application.

Primary goal:
- create a full-body avatar of the same person from the uploaded photo
- preserve as much of the person's identity as possible
- the face should remain recognizably based on the uploaded person
- do not create a generic model face
- do not redesign the person's face

Preserve:
- facial features
- face shape
- eye shape and eye spacing
- eyebrow shape
- nose shape
- lip shape
- jawline
- skin tone
- age impression
- hair color
- hair style
- general appearance

Normalize everything into a consistent try-on template:
- ${getBodyDescription(bodyType)}
- front-facing
- full body visible from head to toes
- standing straight
- arms relaxed close to body
- hands visible
- legs straight
- feet visible
- symmetrical neutral pose
- realistic polished computer-generated look
- professional virtual fitting-room asset

Clothing:
- simple fitted beige athletic tank top
- fitted beige biker shorts
- barefoot
- clothing must be clearly visible as clothing
- no accessories
- no jewelry
- no jacket
- no jeans
- no skirt
- no outerwear
- no swimsuit
- no underwear
- no lingerie
- no revealing outfit

Background:
- clean warm off-white or very light beige background
- no props
- no background scene
- no text
- no watermark

Do not crop the body.
Do not rotate the pose.
Do not add props.
Do not change the person into someone else.
`.trim();
}

// export async function generateAvatarFromPhoto({
//   generationId,
//   sourceImagePath,
// }: {
//   generationId: number;
//   sourceImagePath: string;
// }) {
//   const imageFile = await fs.readFile(sourceImagePath);

//   const prompt = `
// Transform this uploaded user photo into a standardized full-body avatar for a virtual try-on application.

// Keep as much of the person's identity as possible:
// - facial features
// - hair color
// - hair style
// - general appearance

// But normalize everything into a consistent try-on template:
// - front-facing
// - full body visible from head to toes
// - standing straight
// - arms relaxed close to body
// - symmetrical pose
// - clean white background
// - realistic polished computer-generated look

// Clothing:
// - simple fitted beige athletic tank top
// - fitted biker shorts
// - barefoot
// - no accessories
// - no jewelry
// - no jacket
// - no jeans
// - no skirt
// - no outerwear

// Do not crop the body.
// Do not rotate the pose.
// Do not add props or background scene.
// `.trim();

//   const result = await openai.images.edit({
//     model: "gpt-image-1.5",
//     image: new File([imageFile], "avatar-photo.png", { type: "image/png" }),
//     prompt,
//     size: "1024x1536",
//     quality: "high",
//     output_format: "png",
//     input_fidelity: "high",
//   });

//   const b64 = result.data?.[0]?.b64_json;
//   if (!b64) {
//     throw new Error("OpenAI edit did not return image data");
//   }

//   const buffer = Buffer.from(b64, "base64");

//   const outputDir = path.resolve(process.cwd(), "public", "generated-avatars");
//   await fs.mkdir(outputDir, { recursive: true });

//   const filename = `avatar-${generationId}-from-photo.png`;
//   const filePath = path.join(outputDir, filename);

//   await fs.writeFile(filePath, buffer);

//   return {
//     imageUrl: `/generated-avatars/${filename}`,
//   };
// }

export async function generateAvatarFromPhoto({
  generationId,
  sourceImagePath,
  bodyType,
}: {
  generationId: number;
  sourceImagePath: string;
  bodyType: BodyType;
}): Promise<{ imageUrl: string; skinToneHex: string | null }> {
  const publicDir = path.resolve(process.cwd(), "public");
  const outputDir = path.join(publicDir, "generated-avatars");

  await fs.mkdir(outputDir, { recursive: true });

  const rawBuffer = await fs.readFile(sourceImagePath);

  const normalizedPhotoBuffer = await sharp(rawBuffer)
    .rotate()
    .resize(1024, 1024, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const photoFile = await toFile(normalizedPhotoBuffer, "reference-photo.png", {
    type: "image/png",
  });

  const result = await openai.images.edit({
  model: "gpt-image-1.5",
  image: photoFile,
  prompt: buildFullBodyAvatarPrompt(bodyType),
  size: "1024x1536",
  quality: "high",
  output_format: "png",
  input_fidelity: "high",
});

  const b64 = result.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI did not return an image.");
  }

  const generatedBuffer = Buffer.from(b64, "base64");

  const outputFileName = `avatar-${generationId}.png`;
  const outputPath = path.join(outputDir, outputFileName);

  await sharp(generatedBuffer)
    .resize(1024, 1536, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toFile(outputPath);

  return {
    imageUrl: `/generated-avatars/${outputFileName}`,
    skinToneHex: null,
  };
}

export async function createAvatarGeneration(input: AvatarGeneration) {
  const query = `
    INSERT INTO avatar_generations (
      user_profile_id, prompt_version, model, status, image_url, layout_preset
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
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
  const result = await db.query(
    `SELECT * FROM avatar_generations WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function getLatestAvatarGenerationByUserProfileId(userProfileId: number) {
  const result = await db.query(
    `SELECT * FROM avatar_generations
     WHERE user_profile_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userProfileId]
  );

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
  const result = await db.query(
    `UPDATE avatar_generations
     SET
       status        = COALESCE($1, status),
       image_url     = COALESCE($2, image_url),
       layout_preset = COALESCE($3, layout_preset),
       updated_at    = NOW()
     WHERE id = $4
     RETURNING *`,
    [updates.status ?? null, updates.imageUrl ?? null, updates.layoutPreset ?? null, id]
  );

  return result.rows[0] ?? null;
}