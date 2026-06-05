import { useEffect, useMemo, useState } from "react"; // хуки React
import {
  buildAvatarImageUrl,
  createAvatarGeneration,
  generateAvatarFromPhoto,
  getLatestAvatarGeneration,
  getOutfitSimple,
  uploadAvatarPhoto,
} from "../api/client";

import type { Filters, Item, Slot, SelectedBySlot } from "../features/outfit/types"; // типы для строгой типизации
import Layout from "../shared/ui/Layout"; // общий каркас страницы
import Controls from "../features/outfit/components/Controls"; // панель фильтров и кнопок
import OutfitGrid from "../features/outfit/components/OutfitGrid"; // сетка карточек одежды
import OutfitPreview from "../features/outfit/components/OutfitPreview"; // «примерочная» с аватаром и слоями
import "../styles/index.css"; // стили приложения
import type { BodyPreset } from "../config/bodyPresets";





// ВАЖНО: в types.Item должны быть необязательные поля:
// style_tags?: string[]; seasons?: string[];
// (мы их используем при фильтрации на клиенте)

export default function App() {
  // allItems — СЫРЫЕ данные, пришедшие с сервера (после нормализации и дедупликации)
  const [allItems, setAllItems] = useState<Item[]>([]);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [activeStyleTab, setActiveStyleTab] = useState("All");

  // filters — «единственный источник правды» для фильтрации и API-запроса
  const [filters, setFilters] = useState<Filters>({
    style: "any", // стиль: any | casual | sport | classic ...
    season: "all", // сезон: all | winter | spring | summer | fall
    limit: 7, // лимит по количеству карточек в гриде (и/или для API)
  });

  // selectedBySlot — надетые вещи (по слотам): top, bottom, outerwear, shoes
  const [selectedBySlot, setSelectedBySlot] = useState<SelectedBySlot>({});

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
const [avatarError, setAvatarError] = useState<string | null>(null);
const [photoUploaded, setPhotoUploaded] = useState(false);
const [bodyPreset, setBodyPreset] = useState<BodyPreset>("hourglass");

  // порядок отрисовки слоёв на аватаре (низ под верхом, поверх — верхняя одежда)
  const layerOrder: Slot[] = ["bottom", "top", "outerwear"];

  // ----------------- helpers (вспомогательные функции) -----------------
  // toLower — безопасно приводит значение к строке lower-case
  const toLower = (v: unknown) => String(v ?? "").toLowerCase();

  // extractStrings — вытаскивает строковые значения (или поля name) из массива/объекта/строки
  // (оставлено как утилита — вдруг пригодится для дополнительных источников данных)
  const extractStrings = (x: any): string[] => {
    if (!x) return [];
    if (Array.isArray(x))
      return x
        .map((v) =>
          typeof v === "string"
            ? toLower(v)
            : v && typeof v === "object" && "name" in v
            ? toLower((v as any).name)
            : ""
        )
        .filter(Boolean);
    if (typeof x === "string") return [toLower(x)];
    if (typeof x === "object" && "name" in x) return [toLower((x as any).name)];
    return [];
  };

  // normalizeCategory — приводим сырую категорию/«корзину» к одному из слотов
  // чтобы на клиенте было точно top | bottom | outerwear | shoes
  const normalizeCategory = (raw: string | undefined, bucket: string) => {
    const v = (raw ?? "").toLowerCase();
    if (v.startsWith("top")) return "top";
    if (v.startsWith("bottom")) return "bottom";
    if (v.startsWith("outer")) return "outerwear";
    if (v.startsWith("shoe")) return "shoes";
    if (bucket === "tops") return "top";
    if (bucket === "bottoms") return "bottom";
    return bucket as any; // fallback (лучше не попадать сюда, но на всякий случай)
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


  // uniqueBy — удаляет дубликаты по ключу (например, "category__image")
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
    try {
      const latest = await getLatestAvatarGeneration(6);

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
}, []);

  // pick — выбирает случайный элемент массива (для генерации аутфита)
  const pick = <T,>(arr: T[]) =>
    !arr || arr.length === 0
      ? undefined
      : arr[Math.floor(Math.random() * arr.length)];

  // --------------- data loading (загрузка данных с сервера) ---------------
  useEffect(() => {
    // вызываем API с текущими значениями фильтров
    getOutfitSimple({
      userId: 1,
      style: filters.style,
      season: filters.season,
      limit: filters.limit,
    })
      .then((data: any) => {
        // сервер возвращает 4 «корзины»: tops, bottoms, outerwear, shoes
        const buckets = ["tops", "bottoms", "outerwear", "shoes"] as const;

        // утилита: аккуратно приводим значение к массиву строк (lowercase)
        const asStringArray = (x: unknown): string[] =>
          Array.isArray(x)
            ? x.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
            : [];

        // flat — «сплющиваем» все корзины в один массив Item
        const flat: Item[] = buckets.flatMap((b) =>
          (data?.[b] ?? []).map((it: any) => {
            const image = it.image ?? it.image_url; // поддержка разных полей
            const category = normalizeCategory(it.category, b) as Slot;

            // твоя БД хранит массивы строк по стилям/сезонам — приводим к нижнему регистру
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
              style_tags, // например ["casual","sport"]
              seasons, // например ["winter","fall"]
            } as Item;
          })
        );

        // dedup — удаляем дубликаты карточек в пределах категории по одинаковой картинке
        const dedup = uniqueBy(flat, (i) => `${i.category}__${i.image}`);
        setAllItems(dedup); // сохраняем в состояние
      })
      .catch((e) => {
        console.error("API error:", e);
        setAllItems([]); // в случае ошибки — пустой список (чтобы UI не ломался)
      });
    // запускаем эффект при изменении фильтров: style/season/limit
  }, [filters.style, filters.season, filters.limit]);

  // --------------- filtering for grid & generation (клиентская фильтрация) ---------------
  const filteredItems = useMemo(() => {
    // берём текущие значения фильтров в нижнем регистре
    const style = String(filters.style || "any").toLowerCase(); // "casual" | "sport" | "any"
    const season = String(filters.season || "all").toLowerCase(); // "winter" | ... | "all"

    // функция, которая говорит — «вещь проходит фильтр или нет»
    const passes = (it: Item) => {
      const styles = (it.style_tags ?? []).map((s) => String(s).toLowerCase());
      const seasons = (it.seasons ?? []).map((s) => String(s).toLowerCase());

      // fail-open: если у вещи нет тегов, то не отбрасываем её,
      // чтобы совсем не пустить выдачу (особенно на ранних данных)
      const okStyle =
        style === "any" || styles.length === 0 || styles.includes(style);
      const okSeason =
        season === "all" || seasons.length === 0 || seasons.includes(season);
      return okStyle && okSeason;
    };

    // применяем фильтр
    const list = allItems.filter(passes);

    // полезный лог в консоль — сразу видим итог фильтрации
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

    // если задан limit — обрезаем список, иначе возвращаем весь
    return filters.limit ? list.slice(0, filters.limit) : list;
  }, [allItems, filters]);

  const BODY_BASE_IMAGE_MAP: Record<BodyPreset, string> = {
  rectangle: "/rectangle_type.png",
  pear: "/pear_type.png",
  hourglass: "/hourglass_type.png",
  apple: "/apple_type.png",
};

const currentBaseBodyUrl = BODY_BASE_IMAGE_MAP[bodyPreset];

const previewAvatarUrl = avatarUrl ?? "";

  // --------------- wear / clear (надеть/снять) ---------------
  function equip(item: Item) {
    // слот определяется категорией вещи
    const slot = item.category as Slot;

    // если нажали на «Wear» для вещи, которая уже надета — снимаем
    // иначе надеваем/заменяем в соответствующем слоте
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

  // снять всё сразу
  function clearAll() {
    setSelectedBySlot({});
  }

  // --------------- GENERATE from filters (генерация аутфита по фильтрам) ---------------
  function generateOutfit() {
    // выбираем только из уже отфильтрованных вещей (учтены style + season)
    const top = filteredItems.filter((i) => i.category === "top");
    const bottom = filteredItems.filter((i) => i.category === "bottom");
    const outerwear = filteredItems.filter((i) => i.category === "outerwear");
    const shoes = filteredItems.filter((i) => i.category === "shoes");

    // собираем новый объект выбранных вещей
    const next: SelectedBySlot = {};
    const t = pick(top);
    const b = pick(bottom);
    const o = pick(outerwear);
    const s = pick(shoes);

    if (t) next.top = t;
    if (b) next.bottom = b;
    if (o) next.outerwear = o; // верхняя одежда — опционально
    if (s) next.shoes = s; // обувь показываем рядом, не на аватаре

    setSelectedBySlot(next);
  }
  // --- конец логики ---

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

      {/* HEADER */}
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
  {/* LEFT */}
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
      console.log("file input changed");

      const file = e.target.files?.[0];
      if (!file) return;

      setSelectedPhoto(file);
      setAvatarError(null);
      setPhotoUploaded(false);
      setIsUploadingPhoto(true);

      try {
        const data = await uploadAvatarPhoto(6, file);
        console.log("upload response:", data);
        console.log("photo uploaded");
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

        const created = await createAvatarGeneration(6);

        await generateAvatarFromPhoto(created.id, bodyPreset);

        const latestData = await getLatestAvatarGeneration(6);

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
      opacity: isGeneratingAvatar || isUploadingPhoto || !photoUploaded ? 0.7 : 1,
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
      fontSize: 12,
      color: avatarError ? "#8a2f2f" : "#5c5248",
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: 150,
    }}
  >

  </div>
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

  {/* CENTER */}
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

  {/* RIGHT */}
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

      {/* MAIN GRID */}
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "260px minmax(420px, 1fr) 280px",
    gap: 20,
    alignItems: "start",
  }}
>
        {/* CATALOG */}
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

        {/* AVATAR */}
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
  {/* фон */}

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
  {/* тень под ногами */}
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

  {/* аватар */}
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
        {/* RIGHT PANEL */}
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