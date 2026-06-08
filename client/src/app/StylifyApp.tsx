import { useEffect, useMemo, useState } from "react";
import {
  buildAvatarImageUrl,
  createAvatarGeneration,
  generateAvatarFromPhoto,
  getLatestAvatarGeneration,
  getOutfitSimple,
  uploadAvatarPhoto,
} from "../api/client";

import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

import type { Filters, Item, Slot, SelectedBySlot } from "../features/outfit/types";
import Layout from "../shared/ui/Layout";
import OutfitGrid from "../features/outfit/components/OutfitGrid";
import OutfitPreview from "../features/outfit/components/OutfitPreview";
import "../styles/index.css";
import type { BodyPreset } from "../config/bodyPresets";

export default function App() {

const { signOut, user } = useAuth()
const navigate = useNavigate()
const currentUserId = user?.id;

if (!currentUserId) {
  return <div>Loading user...</div>;
}


  const [allItems, setAllItems] = useState<Item[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeStyleTab, setActiveStyleTab] = useState("All");

  const [filters, setFilters] = useState<Filters>({
    style: "any",
    season: "all",
    limit: 7,
  });

  const [selectedBySlot, setSelectedBySlot] = useState<SelectedBySlot>({});
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [bodyPreset, setBodyPreset] = useState<BodyPreset>("hourglass");

  const normalizeCategory = (raw: string | undefined, bucket: string) => {
    const v = (raw ?? "").toLowerCase();
    if (v.startsWith("top")) return "top";
    if (v.startsWith("bottom")) return "bottom";
    if (v.startsWith("outer")) return "outerwear";
    if (v.startsWith("shoe")) return "shoes";
    if (bucket === "tops") return "top";
    if (bucket === "bottoms") return "bottom";
    return bucket as Slot;
  };

  const selectedPhotoPreviewUrl = useMemo(() => {
    if (!selectedPhoto) return null;
    return URL.createObjectURL(selectedPhoto);
  }, [selectedPhoto]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreviewUrl) {
        URL.revokeObjectURL(selectedPhotoPreviewUrl);
      }
    };
  }, [selectedPhotoPreviewUrl]);

  const uniqueBy = <T,>(arr: T[], keyOf: (x: T) => string) => {
    const seen = new Set<string>();
    return arr.filter((x) => {
      const k = keyOf(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  useEffect(() => {
  let isMounted = true;

  async function loadLatestAvatar() {
    if (!currentUserId) return;

    try {
      const latest = await getLatestAvatarGeneration(currentUserId);

      if (!isMounted) return;

      if (latest?.image_url) {
        setAvatarUrl(`${buildAvatarImageUrl(latest.image_url)}?t=${Date.now()}`);
        setPhotoUploaded(true);
      }
    } catch (err) {
      console.error("Failed to load latest avatar:", err);
    }
  }

  loadLatestAvatar();

  return () => {
    isMounted = false;
  };
}, [currentUserId]);

  const pick = <T,>(arr: T[]) =>
    !arr || arr.length === 0
      ? undefined
      : arr[Math.floor(Math.random() * arr.length)];

  useEffect(() => {
    getOutfitSimple({
      userId: 1,
      style: filters.style,
      season: filters.season,
      limit: filters.limit,
    })
      .then((data: any) => {
        const buckets = ["tops", "bottoms", "outerwear", "shoes"] as const;

        const asStringArray = (x: unknown): string[] =>
          Array.isArray(x)
            ? x.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
            : [];

        const flat: Item[] = buckets.flatMap((b) =>
          (data?.[b] ?? []).map((it: any) => {
            const image = it.image ?? it.image_url;
            const category = normalizeCategory(it.category, b) as Slot;

            const style_tags = asStringArray(
              it.style_tags ?? it.styles ?? it.style
            );
            const seasons = asStringArray(
              it.seasons ?? it.season_tags ?? it.season
            );

            return {
              id: it.id,
              name: it.name,
              image,
              category,
              style_tags,
              seasons,
            } as Item;
          })
        );

        const dedup = uniqueBy(flat, (i) => `${i.category}__${i.image}`);
        setAllItems(dedup);
      })
      .catch((e) => {
        console.error("API error:", e);
        setAllItems([]);
      });
  }, [filters.style, filters.season, filters.limit]);

  const filteredItems = useMemo(() => {
    const style = String(filters.style || "any").toLowerCase();
    const season = String(filters.season || "all").toLowerCase();

    const passes = (it: Item) => {
      const styles = (it.style_tags ?? []).map((s) => String(s).toLowerCase());
      const seasons = (it.seasons ?? []).map((s) => String(s).toLowerCase());

      const okStyle =
        style === "any" || styles.length === 0 || styles.includes(style);
      const okSeason =
        season === "all" || seasons.length === 0 || seasons.includes(season);

      return okStyle && okSeason;
    };

    const list = allItems.filter(passes);

    console.log("[filter] style:", style, "season:", season, {
      total: allItems.length,
      matched: list.length,
      byCat: {
        top: list.filter((i) => i.category === "top").length,
        bottom: list.filter((i) => i.category === "bottom").length,
        outerwear: list.filter((i) => i.category === "outerwear").length,
        shoes: list.filter((i) => i.category === "shoes").length,
      },
    });

    return filters.limit ? list.slice(0, filters.limit) : list;
  }, [allItems, filters]);

  const previewAvatarUrl = avatarUrl ?? "";

  function equip(item: Item) {
    const slot = item.category as Slot;

    setSelectedBySlot((prev) => {
      const same = prev[slot]?.id === item.id;
      if (same) {
        const cp = { ...prev };
        delete cp[slot];
        return cp;
      }
      return { ...prev, [slot]: item };
    });
  }

  function clearAll() {
    setSelectedBySlot({});
  }

  function generateOutfit() {
    const top = filteredItems.filter((i) => i.category === "top");
    const bottom = filteredItems.filter((i) => i.category === "bottom");
    const outerwear = filteredItems.filter((i) => i.category === "outerwear");
    const shoes = filteredItems.filter((i) => i.category === "shoes");

    const next: SelectedBySlot = {};
    const t = pick(top);
    const b = pick(bottom);
    const o = pick(outerwear);
    const s = pick(shoes);

    if (t) next.top = t;
    if (b) next.bottom = b;
    if (o) next.outerwear = o;
    if (s) next.shoes = s;

    setSelectedBySlot(next);
  }

  return (
    <Layout>
      <div
        style={{
          minHeight: "100vh",
          padding: "8px 12px",
          color: "#2e2a25",
          boxSizing: "border-box",
          backgroundImage:
            "linear-gradient(rgba(239, 230, 220, 0.28), rgba(239, 230, 220, 0.28)), url('/boutique-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div
          style={{
            width: "96%",
            maxWidth: "1280px",
            margin: "0 auto",
            paddingTop: "8px",
          }}
        >
          <header
            style={{
              background: "#f8f4ed",
              borderRadius: "20px",
              padding: "16px 22px",
              marginBottom: "14px",
              minHeight: "64px",
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: "16px",
            }}
          >

            <button
  onClick={async () => {
    await signOut()
    navigate('/login')
  }}
  style={{
    background: '#2e2a25',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    height: '34px',
    padding: '0 14px',
    fontWeight: 600,
    cursor: 'pointer',
  }}
>
  Sign out
</button>

<div>{user?.email}</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <button
                onClick={() => document.getElementById("fileInput")?.click()}
                style={{
                  background: "#d9c7b8",
                  border: "none",
                  borderRadius: "999px",
                  height: "34px",
                  padding: "0 14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Upload photo
              </button>

              <input
                id="fileInput"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onClick={(e) => {
                  (e.currentTarget as HTMLInputElement).value = "";
                }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setSelectedPhoto(file);
                  setAvatarError(null);
                  setPhotoUploaded(false);
                  setIsUploadingPhoto(true);

                  try {
                    await uploadAvatarPhoto(currentUserId, file);
                    setPhotoUploaded(true);
                  } catch (err) {
                    console.error(err);
                    setAvatarError("Upload failed");
                    setPhotoUploaded(false);
                  } finally {
                    setIsUploadingPhoto(false);
                  }
                }}
              />

              <button
                disabled={isGeneratingAvatar || isUploadingPhoto || !photoUploaded}
                onClick={async () => {
                  try {
                    setIsGeneratingAvatar(true);
                    setAvatarError(null);

                    const created = await createAvatarGeneration(currentUserId);
                    await generateAvatarFromPhoto(created.id, bodyPreset);

                    const latestData = await getLatestAvatarGeneration(currentUserId);

                    if (latestData?.image_url) {
                      setAvatarUrl(
                        `${buildAvatarImageUrl(latestData.image_url)}?t=${Date.now()}`
                      );
                    }
                  } catch (err) {
                    console.error(err);
                    setAvatarError("Failed to generate avatar");
                  } finally {
                    setIsGeneratingAvatar(false);
                  }
                }}
                style={{
                  background:
                    isGeneratingAvatar || isUploadingPhoto || !photoUploaded
                      ? "#8f867e"
                      : "#2e2a25",
                  color: "#fff",
                  border: "none",
                  borderRadius: "999px",
                  height: "34px",
                  padding: "0 14px",
                  fontWeight: 600,
                  cursor:
                    isGeneratingAvatar || isUploadingPhoto || !photoUploaded
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isGeneratingAvatar || isUploadingPhoto || !photoUploaded ? 0.7 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isUploadingPhoto
                  ? "Uploading..."
                  : isGeneratingAvatar
                  ? "Generating..."
                  : "Generate avatar"}
              </button>

              {selectedPhotoPreviewUrl && (
                <img
                  src={selectedPhotoPreviewUrl}
                  alt="Selected user photo"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "10px",
                    objectFit: "cover",
                    border: "1px solid rgba(46, 42, 37, 0.12)",
                    background: "#fff",
                    flexShrink: 0,
                  }}
                />
              )}

              <div
                style={{
                  fontSize: 13,
                  color: avatarError ? "#8a2f2f" : "#5c5248",
                  fontWeight: 500,
                  lineHeight: 1.35,
                }}
              >
                {avatarError
                  ? avatarError
                  : isUploadingPhoto
                  ? "Uploading photo..."
                  : photoUploaded
                  ? "Photo uploaded ✓"
                  : "Upload a photo to generate your avatar"}
              </div>
            </div>

            <div
              style={{
                fontWeight: 700,
                fontSize: 28,
                lineHeight: 1,
                textAlign: "center",
                color: "#2e2a25",
              }}
            >
              Stylify
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              {["All", "Casual", "Smart", "Chic"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveStyleTab(tab)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    background: activeStyleTab === tab ? "#2e2a25" : "#e7ddd2",
                    color: activeStyleTab === tab ? "#fff" : "#2e2a25",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "260px minmax(420px, 1fr) 280px",
              gap: 20,
              alignItems: "start",
            }}
          >
            <section
              style={{
                background: "rgba(248, 244, 237, 0.72)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                borderRadius: "24px",
                padding: "10px",
                height: "820px",
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: 0,
                boxShadow: "0 12px 30px rgba(80, 60, 40, 0.08)",
              }}
            >
              <h3 style={{ margin: "0 0 8px" }}>Catalog</h3>
              <OutfitGrid items={filteredItems} onSelect={equip} />
            </section>

            <section
              style={{
                background: "rgba(248, 244, 237, 0.58)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                borderRadius: "24px",
                padding: "10px",
                height: "820px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: "0 12px 30px rgba(80, 60, 40, 0.08)",
                overflow: "hidden",
                width: "fit-content",
                justifySelf: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "300px",
                  height: "200px",
                  background: "rgba(248, 244, 237, 0.26)",
                  filter: "blur(20px)",
                  zIndex: 1,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  bottom: 40,
                  width: "200px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.12)",
                  filter: "blur(12px)",
                  zIndex: 1,
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <OutfitPreview
                  avatarUrl={previewAvatarUrl}
                  selectedBySlot={selectedBySlot}
                  layerOrder={["bottom", "top", "outerwear"]}
                  onClear={clearAll}
                  width={560}
                  height={820}
                  bodyPreset={bodyPreset}
                />

                {isGeneratingAvatar && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#2e2a25",
                      background: "rgba(255,255,255,0.7)",
                      padding: "8px 14px",
                      borderRadius: "999px",
                    }}
                  >
                    Generating avatar...
                  </div>
                )}

                {!isGeneratingAvatar && avatarUrl && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#2e2a25",
                      background: "rgba(255,255,255,0.7)",
                      padding: "8px 14px",
                      borderRadius: "999px",
                    }}
                  >
                    Avatar generated
                  </div>
                )}

                {!isGeneratingAvatar && !avatarUrl && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#5c5248",
                      background: "rgba(255,255,255,0.7)",
                      padding: "8px 14px",
                      borderRadius: "999px",
                    }}
                  >
                    Your generated avatar will appear here
                  </div>
                )}

                {avatarError && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#8a2f2f",
                      background: "rgba(255,255,255,0.85)",
                      padding: "8px 14px",
                      borderRadius: "999px",
                    }}
                  >
                    {avatarError}
                  </div>
                )}
              </div>
            </section>

            <aside
              style={{
                background: "rgba(248, 244, 237, 0.72)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                borderRadius: "24px",
                padding: "10px",
                boxShadow: "0 12px 30px rgba(80, 60, 40, 0.08)",
              }}
            >
              <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>Outfit Preview</h3>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {(["top", "bottom", "outerwear", "shoes"] as Slot[]).map((slot) => {
                  const item = selectedBySlot[slot];

                  return (
                    <div
                      key={slot}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "56px 1fr",
                        gap: 10,
                        alignItems: "center",
                        background: "#fffaf5",
                        border: "1px solid #e4d8cc",
                        borderRadius: 14,
                        padding: 10,
                        minHeight: 70,
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 10,
                          background: "#f3ede7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {item ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{
                              width: "90%",
                              height: "90%",
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: "#8a817c" }}>
                            empty
                          </span>
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8a817c",
                            textTransform: "capitalize",
                            marginBottom: 4,
                          }}
                        >
                          {slot}
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#2e2a25",
                          }}
                        >
                          {item ? item.name : "Not selected"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={generateOutfit}
                style={{
                  width: "100%",
                  marginTop: 16,
                  background: "#2e2a25",
                  color: "#fff",
                  borderRadius: "999px",
                  height: 44,
                  border: "none",
                }}
              >
                Generate Outfit
              </button>

              <button
                onClick={clearAll}
                style={{
                  width: "100%",
                  marginTop: 10,
                  background: "#e7ddd2",
                  borderRadius: "999px",
                  height: 44,
                  border: "none",
                }}
              >
                Clear all
              </button>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  );
}