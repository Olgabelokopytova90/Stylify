export type GenderPresentation = "feminine" | "masculine" | "androgynous";
export type BodyShape = "rectangle" | "pear" | "hourglass" | "apple";
export type HeightBucket = "petite" | "average" | "tall";
export type SkinTone = "light" | "light-medium" | "medium" | "deep";
export type HairStyle = "long-straight" | "long-wavy" | "bob" | "ponytail";
export type HairColor = "black" | "dark-brown" | "brown" | "blonde" | "red";

export type UserProfile = {
  id?: number;
  userId?: number;
  genderPresentation: GenderPresentation;
  bodyShape: BodyShape;
  heightBucket: HeightBucket;
  skinTone: SkinTone;
  hairStyle: HairStyle;
  hairColor: HairColor;
  stylePreferences: string[];
  occasionPreferences?: string[];
  avatarImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};