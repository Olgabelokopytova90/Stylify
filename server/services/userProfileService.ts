import db from "../db/connect";
import type { UserProfile } from "../types/userProfile";

export async function createUserProfile(userId: number, profile: UserProfile) {
  const query = `
    INSERT INTO user_profiles (
      user_id,
      gender_presentation,
      body_shape,
      height_bucket,
      skin_tone,
      hair_style,
      hair_color,
      style_preferences,
      occasion_preferences,
      avatar_image_url
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING
      id,
      user_id,
      gender_presentation,
      body_shape,
      height_bucket,
      skin_tone,
      hair_style,
      hair_color,
      style_preferences,
      occasion_preferences,
      avatar_image_url,
      created_at,
      updated_at
  `;

  const values = [
    userId,
    profile.genderPresentation,
    profile.bodyShape,
    profile.heightBucket,
    profile.skinTone,
    profile.hairStyle,
    profile.hairColor,
    profile.stylePreferences,
    profile.occasionPreferences ?? [],
    profile.avatarImageUrl ?? null,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
}

export async function getUserProfileByUserId(userId: number) {
  const query = `
    SELECT
      id,
      user_id,
      gender_presentation,
      body_shape,
      height_bucket,
      skin_tone,
      hair_style,
      hair_color,
      style_preferences,
      occasion_preferences,
      avatar_image_url,
      created_at,
      updated_at
    FROM user_profiles
    WHERE user_id = $1
  `;

  const result = await db.query(query, [userId]);
  return result.rows[0] ?? null;
}

export async function updateUserProfileByUserId(
  userId: number,
  updates: Partial<UserProfile>
) {
  const query = `
    UPDATE user_profiles
    SET
      gender_presentation = COALESCE($1, gender_presentation),
      body_shape = COALESCE($2, body_shape),
      height_bucket = COALESCE($3, height_bucket),
      skin_tone = COALESCE($4, skin_tone),
      hair_style = COALESCE($5, hair_style),
      hair_color = COALESCE($6, hair_color),
      style_preferences = COALESCE($7, style_preferences),
      occasion_preferences = COALESCE($8, occasion_preferences),
      avatar_image_url = COALESCE($9, avatar_image_url),
      updated_at = NOW()
    WHERE user_id = $10
    RETURNING
      id,
      user_id,
      gender_presentation,
      body_shape,
      height_bucket,
      skin_tone,
      hair_style,
      hair_color,
      style_preferences,
      occasion_preferences,
      avatar_image_url,
      created_at,
      updated_at
  `;

  const values = [
    updates.genderPresentation ?? null,
    updates.bodyShape ?? null,
    updates.heightBucket ?? null,
    updates.skinTone ?? null,
    updates.hairStyle ?? null,
    updates.hairColor ?? null,
    updates.stylePreferences ?? null,
    updates.occasionPreferences ?? null,
    updates.avatarImageUrl ?? null,
    userId,
  ];

  const result = await db.query(query, values);
  return result.rows[0] ?? null;
}

export async function deleteUserProfileByUserId(userId: number) {
  const query = `
    DELETE FROM user_profiles
    WHERE user_id = $1
    RETURNING
      id,
      user_id,
      gender_presentation,
      body_shape,
      height_bucket,
      skin_tone,
      hair_style,
      hair_color,
      style_preferences,
      occasion_preferences,
      avatar_image_url,
      created_at,
      updated_at
  `;

  const result = await db.query(query, [userId]);
  return result.rows[0] ?? null;
}