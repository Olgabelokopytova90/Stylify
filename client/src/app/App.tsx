import { useEffect, useMemo, useState } from "react"; // хуки React
import { getOutfitSimple, getLatestAvatarGeneration } from "../api/client"; // API-функция загрузки вещей (по фильтрам)
import type { Filters, Item, Slot, SelectedBySlot } from "../features/outfit/types"; // типы для строгой типизации
import Layout from "../shared/ui/Layout"; // общий каркас страницы
import Controls from "../features/outfit/components/Controls"; // панель фильтров и кнопок
import OutfitGrid from "../features/outfit/components/OutfitGrid"; // сетка карточек одежды
import OutfitPreview from "../features/outfit/components/OutfitPreview"; // «примерочная» с аватаром и слоями
import "../styles/index.css"; // стили приложения



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

//   useEffect(() => {
//   getLatestAvatarGeneration(6)
//     .then((data) => {
//       if (data?.image_url) {
//         setAvatarUrl(`http://localhost:3000${data.image_url}?t=${Date.now()}`);;
//       }
//     })
//     .catch((e) => {
//       console.error("Avatar fetch error:", e);
//     });
// }, []);

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
        background: "#efe6dc",
        minHeight: "100vh",
        padding: "16px 24px",
        color: "#2e2a25",
      }}
    >

      {/* HEADER */}
      <header
  style={{
    background: "#f8f4ed",
    borderRadius: "20px",
    padding: "12px 20px",
    marginBottom: "16px",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "16px",
  }}
>
  {/* LEFT */}
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <button
      onClick={() => document.getElementById("fileInput")?.click()}
      style={{
        background: "#d9c7b8",
        border: "none",
        borderRadius: "999px",
        height: "40px",
        padding: "0 16px",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Upload photo
    </button>

    <input
      id="fileInput"
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedPhoto(file);
        setAvatarError(null);
      }}
    />

    <button
      disabled={isGeneratingAvatar}
      onClick={async () => {
        try {
          setIsGeneratingAvatar(true);
          setAvatarError(null);

          const res = await fetch(
            "http://localhost:3000/api/avatar-generations/6/generate-from-photo",
            { method: "POST" }
          );

          if (!res.ok) throw new Error("Generation failed");

          const latestRes = await fetch(
            "http://localhost:3000/api/avatar-generations/user/6/latest"
          );

          const latestData = await latestRes.json();

          if (latestData?.image_url) {
            setAvatarUrl(
              `http://localhost:3000${latestData.image_url}?t=${Date.now()}`
            );
          }
        } catch (err) {
          setAvatarError("Failed to generate avatar");
        } finally {
          setIsGeneratingAvatar(false);
        }
      }}
      style={{
        background: "#2e2a25",
        color: "#fff",
        border: "none",
        borderRadius: "999px",
        height: "40px",
        padding: "0 18px",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {isGeneratingAvatar ? "Generating..." : "Generate avatar"}
    </button>
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
    background: "#f8f4ed",
    borderRadius: "24px",
    padding: "16px",
    height: "820px",
    overflowY: "auto",
    overflowX: "hidden",
    minHeight: 0,
  }}
>
          <h3 style={{ marginBottom: 12 }}>Catalog</h3>

          <OutfitGrid items={filteredItems} onSelect={equip} />
        </section>

        {/* AVATAR */}
        <section
  style={{
    background: "#f5efe6",
    borderRadius: "24px",
    padding: "24px",
    height: "820px", // ВОТ ЭТО КЛЮЧ
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  }}
>
  {/* фон */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(circle at center, #f8f4ed 0%, #e7ddd2 100%)",
      borderRadius: "24px",
      zIndex: 0,
    }}
  />

  <div
  style={{
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "90px",
    background:
      "linear-gradient(90deg, rgba(214,195,173,0.9) 0%, rgba(214,195,173,0.45) 60%, rgba(214,195,173,0) 100%)",
    borderTopLeftRadius: "24px",
    borderBottomLeftRadius: "24px",
    zIndex: 1,
  }}
/>
{/* curtains */}
<div
  style={{
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "90px",
    background:
      "linear-gradient(270deg, rgba(214,195,173,0.9) 0%, rgba(214,195,173,0.45) 60%, rgba(214,195,173,0) 100%)",
    borderTopRightRadius: "24px",
    borderBottomRightRadius: "24px",
    zIndex: 1,
  }}
/>

<div
  style={{
    position: "absolute",
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "300px",
    height: "200px",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)",
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
  <div style={{ position: "relative", zIndex: 2 }}>
    {avatarUrl ? (
  <OutfitPreview
    avatarUrl={avatarUrl}
    selectedBySlot={selectedBySlot}
    layerOrder={["bottom", "top", "outerwear"]}
    onClear={clearAll}
    width={420}
    height={760}
  />
) : (
  <div
    style={{
      width: "260px",
      height: "520px",
      borderRadius: "20px",
      background: "rgba(255,255,255,0.35)",
      border: "1px solid rgba(120, 95, 70, 0.08)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      color: "#6b625b",
      textAlign: "center",
      padding: "24px",
    }}
  >
    <div
      style={{
        width: "120px",
        height: "120px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "32px",
      }}
    >
      ✨
    </div>

    <div style={{ fontSize: "18px", fontWeight: 600 }}>
      Your avatar will appear here
    </div>

    <div style={{ fontSize: "14px", lineHeight: 1.5 }}>
      Upload a photo and generate a personalized fitting-room model.
    </div>
  </div>
)}
  </div>
</section>
        {/* RIGHT PANEL */}
        <aside
          style={{
            background: "#f8f4ed",
            borderRadius: "24px",
            padding: "16px",
          }}
        >
          <h3>Outfit Preview</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {Object.entries(selectedBySlot).map(([key, item]) =>
              item ? (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    background: "#fffaf5",
                    padding: "10px",
                    borderRadius: "12px",
                  }}
                >
                  <img
                    src={item.image}
                    style={{ width: 70, height: 70, objectFit: "contain" }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{key}</div>
                  </div>
                </div>
              ) : null
            )}

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
  </Layout>
);
}