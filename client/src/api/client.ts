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

export async function getLatestAvatarGeneration(userId: number) {
  const res = await fetch(
    `${API_BASE}/api/avatar-generations/user/${userId}/latest`
  );

  if (!res.ok) {
    throw new Error(`getLatestAvatarGeneration failed: ${res.status}`);
  }

  return res.json();
}

export async function uploadAvatarPhoto(userId: number, file: File) {
  const formData = new FormData();
  formData.append("photo", file);

  const res = await fetch(
    `${API_BASE}/api/avatar-photo/user/${userId}/upload-photo`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error(`uploadAvatarPhoto failed: ${res.status}`);
  }

  return res.json();
}

export async function createAvatarGeneration(userId: number) {
  const res = await fetch(`${API_BASE}/api/avatar-generations/user/${userId}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`createAvatarGeneration failed: ${res.status}`);
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
    throw new Error(`generateAvatarFromPhoto failed: ${res.status}`);
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
