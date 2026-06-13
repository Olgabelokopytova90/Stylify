import { useEffect, useMemo, useState } from "react";
import {
  buildAvatarImageUrl,
  getLatestAvatarGeneration,
  getOutfitSimple,
  getProfile,
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
  const [displayName, setDisplayName] = useState("");

  const [filters, setFilters] = useState<Filters>({
    style: "any",
    season: "all",
    limit: 7,
  });

  const [selectedBySlot, setSelectedBySlot] = useState<SelectedBySlot>({});
  const [bodyPreset, setBodyPreset] = useState<BodyPreset>("hourglass");

  useEffect(() => {
  async function loadUserProfile() {
    if (!currentUserId) return;

    try {
      const profile = await getProfile(currentUserId);
      setDisplayName(profile.display_name || "");

      if (
        profile.body_type === "rectangle" ||
        profile.body_type === "pear" ||
        profile.body_type === "hourglass" ||
        profile.body_type === "apple"
      ) {
        setBodyPreset(profile.body_type);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
    }
  }

  void loadUserProfile();
}, [currentUserId]);

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
    background: "rgba(248, 244, 237, 0.9)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255, 255, 255, 0.55)",
    borderRadius: "24px",
    padding: "14px 18px",
    marginBottom: "14px",
    minHeight: "74px",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "18px",
    boxShadow: "0 12px 30px rgba(80, 60, 40, 0.08)",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "14px",
        background: "#2e2a25",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "serif",
        fontSize: 21,
        fontWeight: 700,
      }}
    >
      S
    </div>

    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
        Stylify
      </div>
      <div
       style={{
  marginTop: 6,
  fontSize: 18,
  color: "#8a6a4f",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 280,
  fontFamily: "serif",
  fontStyle: "italic",
  fontWeight: 500,
  letterSpacing: "0.02em",
  textTransform: "capitalize",
}}
      >
        {displayName || "Your style profile"}
      </div>
    </div>
  </div>

  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: 8,
      background: "rgba(231, 221, 210, 0.72)",
      padding: 6,
      borderRadius: "999px",
    }}
  >
    {["All", "Casual", "Smart", "Chic"].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveStyleTab(tab)}
        style={{
          padding: "8px 18px",
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          background: activeStyleTab === tab ? "#2e2a25" : "transparent",
          color: activeStyleTab === tab ? "#fff" : "#2e2a25",
        }}
      >
        {tab}
      </button>
    ))}
  </div>

  <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  }}
>
  <button
    onClick={() => {
      navigate("/onboarding?mode=edit");
    }}
    style={{
      background: "rgba(255, 250, 245, 0.72)",
      color: "#2e2a25",
      border: "1px solid #d9cabe",
      borderRadius: "999px",
      height: "38px",
      padding: "0 18px",
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    Edit style profile
  </button>

  <button
    onClick={async () => {
      await signOut();
      navigate("/login");
    }}
    style={{
      background: "#fffaf5",
      color: "#2e2a25",
      border: "1px solid #d9cabe",
      borderRadius: "999px",
      height: "38px",
      padding: "0 18px",
      fontWeight: 700,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }}
  >
    Sign out
  </button>
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

                <div
  style={{
    fontSize: 14,
    fontWeight: 600,
    color: avatarUrl ? "#2e2a25" : "#5c5248",
    background: "rgba(255,255,255,0.7)",
    padding: "8px 14px",
    borderRadius: "999px",
  }}
>
  {avatarUrl ? "Your avatar is ready" : "Complete onboarding to create your avatar"}
</div>
              </div>
            </section>

            <aside
  style={{
    background: "rgba(248, 244, 237, 0.78)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255, 255, 255, 0.55)",
    borderRadius: "26px",
    padding: "18px",
    boxShadow: "0 14px 34px rgba(80, 60, 40, 0.1)",
  }}
>
  <div style={{ marginBottom: 18 }}>
    <div
      style={{
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#a87445",
        fontWeight: 800,
        marginBottom: 6,
      }}
    >
      Selected look
    </div>

    <h3
      style={{
        margin: 0,
        fontSize: 26,
        lineHeight: 1,
        color: "#2e2a25",
        fontWeight: 800,
      }}
    >
      Outfit Preview
    </h3>
  </div>

  <div
    style={{
      display: "grid",
      gap: 12,
      marginBottom: 18,
    }}
  >
    {(["top", "bottom", "outerwear", "shoes"] as Slot[]).map((slot) => {
      const item = selectedBySlot[slot];

      return (
        <div
          key={slot}
          style={{
            display: "grid",
            gridTemplateColumns: "68px 1fr",
            gap: 12,
            alignItems: "center",
            background: item
              ? "rgba(255, 250, 245, 0.96)"
              : "rgba(255, 250, 245, 0.62)",
            border: item ? "1px solid #d7bfa8" : "1px solid #e7ddd2",
            borderRadius: 18,
            padding: 12,
            minHeight: 86,
            boxShadow: item
              ? "0 10px 22px rgba(80, 60, 40, 0.08)"
              : "none",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 16,
              background: item ? "#fff" : "#f1e8df",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid rgba(228, 216, 204, 0.9)",
            }}
          >
            {item ? (
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: "92%",
                  height: "92%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: "#9b9088",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Add
              </span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                color: "#8a817c",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 800,
                marginBottom: 6,
              }}
            >
              {slot}
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#2e2a25",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textTransform: item ? "none" : "none",
              }}
            >
              {item ? item.name : "Not selected"}
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 12,
                color: item ? "#a87445" : "#a59a92",
                fontWeight: 600,
              }}
            >
              {item ? "Added to look" : "Choose from catalog"}
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
      marginTop: 8,
      background: "#2e2a25",
      color: "#fff",
      borderRadius: "999px",
      height: 48,
      border: "none",
      fontWeight: 800,
      fontSize: 15,
      cursor: "pointer",
      boxShadow: "0 10px 20px rgba(46, 42, 37, 0.18)",
    }}
  >
    Create look
  </button>

  <button
    onClick={clearAll}
    style={{
      width: "100%",
      marginTop: 10,
      background: "rgba(255, 250, 245, 0.72)",
      color: "#5c5248",
      border: "1px solid #e4d8cc",
      borderRadius: "999px",
      height: 44,
      fontWeight: 700,
      cursor: "pointer",
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