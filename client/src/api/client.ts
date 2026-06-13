import { supabase } from "../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

type GetOutfitSimpleParams = {
  userId: number;
  style: string;
  season: string;
  limit?: number;
};

export async function getOutfitSimple(params: GetOutfitSimpleParams) {
  const q = new URLSearchParams({
    userId: String(params.userId),
    style: params.style || "any",
    season: params.season || "all",
    ...(params.limit ? { limit: String(params.limit) } : {}),
  });

  const res = await fetch(`${API_BASE}/api/outfits/simple?${q.toString()}`);

  if (!res.ok) {
    throw new Error(`getOutfitSimple failed: ${res.status}`);
  }

  return res.json();
}

export async function getLatestAvatarGeneration(userId: string) {
  const res = await fetch(
    `${API_BASE}/api/avatar-generations/user/${userId}/latest`
  );

  if (!res.ok) {
    throw new Error(`getLatestAvatarGeneration failed: ${res.status}`);
  }

  return res.json();
}

export async function uploadAvatarPhoto(userId: string, file: File) {
  const formData = new FormData();
  formData.append("photo", file);

  const url = `${API_BASE}/api/avatar-photo/user/${userId}/upload-photo`;

  console.log("UPLOAD URL:", url);
  console.log("UPLOAD USER ID:", userId);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();

    console.error("uploadAvatarPhoto response status:", res.status);
    console.error("uploadAvatarPhoto response body:", errorText);

    throw new Error(`uploadAvatarPhoto failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function createAvatarGeneration(userId: string) {
  const url = `${API_BASE}/api/avatar-generations/user/${userId}`;

  console.log("CREATE AVATAR URL:", url);
  console.log("CREATE AVATAR USER ID:", userId);

  const res = await fetch(url, {
    method: "POST",
  });

  if (!res.ok) {
    const errorText = await res.text();

    console.error("createAvatarGeneration response status:", res.status);
    console.error("createAvatarGeneration response body:", errorText);

    throw new Error(`createAvatarGeneration failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

export async function generateAvatarFromPhoto(
  avatarId: number,
  bodyType: "rectangle" | "pear" | "hourglass" | "apple"
) {
  const res = await fetch(
    `${API_BASE}/api/avatar-generations/${avatarId}/generate-from-photo`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bodyType }),
    }
  );

  if (!res.ok) {
  const errorData = await res.json().catch(() => null);

  if (res.status === 429) {
    throw new Error(
      errorData?.error ||
        "You’ve reached your monthly avatar generation limit. Please try again next month."
    );
  }

  throw new Error(
    errorData?.error || `Avatar generation failed. Please try again.`
  );
}

  return res.json();
}

export function buildAvatarImageUrl(imagePath: string) {
  if (!imagePath) return "";

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return `${API_BASE}${imagePath}`;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export async function createProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export async function updateProfile(
  userId: string,
  profile: {
    display_name?: string;
    body_type?: string;
    fit_preference?: string;
    onboarding_completed?: boolean;
  }
) {
  const { data, error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export async function saveStylePreferences(userId: string, styles: string[]) {
  const rows = styles.map((style) => ({
    user_id: userId,
    style,
  }));

  const { data, error } = await supabase
    .from("user_style_preferences")
    .insert(rows)
    .select();

  if (error) {
    throw error;
  }

  return data;
};

export async function getStylePreferences(userId: string) {
  const { data, error } = await supabase
    .from("user_style_preferences")
    .select("style")
    .eq("user_id", userId);

  if (error) throw error;

  return (data ?? []).map((row) => row.style);
}

export async function deleteStylePreferences(userId: string) {
  const { error } = await supabase
    .from("user_style_preferences")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
};

export async function saveOnboardingProfile(
  userId: string,
  data: {
    display_name: string;
    body_type: string;
    fit_preference: string;
    styles: string[];
  }
) {
  const updatedProfile = await updateProfile(userId, {
    display_name: data.display_name,
    body_type: data.body_type,
    fit_preference: data.fit_preference,
    onboarding_completed: true,
  });

  await deleteStylePreferences(userId);

  if (data.styles.length > 0) {
    await saveStylePreferences(userId, data.styles);
  }

  return updatedProfile;
};

export async function saveAvatarRecord(userId: string, imageUrl: string) {
  const { data, error } = await supabase
    .from("avatars")
    .insert({
      user_id: userId,
      image_url: imageUrl,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
