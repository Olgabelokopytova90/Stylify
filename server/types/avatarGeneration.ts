export type AvatarGenerationStatus = "pending" | "ready" | "failed";

export type LayoutPreset = "slim" | "average" | "curvy";

export type AvatarGeneration = {
  id?: number;
  userProfileId: number;
  promptVersion: string;
  model: string;
  status: AvatarGenerationStatus;
  imageUrl?: string | null;
  layoutPreset?: LayoutPreset | null;
  createdAt?: string;
  updatedAt?: string;
};