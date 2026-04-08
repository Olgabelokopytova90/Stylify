import { useEffect, useMemo, useState } from "react"; // хуки React
import { getOutfitSimple } from "../api/client"; // API-функция загрузки вещей (по фильтрам)
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

  // filters — «единственный источник правды» для фильтрации и API-запроса
  const [filters, setFilters] = useState<Filters>({
    style: "any", // стиль: any | casual | sport | classic ...
    season: "all", // сезон: all | winter | spring | summer | fall
    limit: 7, // лимит по количеству карточек в гриде (и/или для API)
  });

  // selectedBySlot — надетые вещи (по слотам): top, bottom, outerwear, shoes
  const [selectedBySlot, setSelectedBySlot] = useState<SelectedBySlot>({});

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
      {/* Заголовок (можно добавить эмодзи/логотип) */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}
      ></div>

      {/* ГОРИЗОНТАЛЬНЫЕ фильтры + кнопки (Controls сам рисует inline-стилями) */}
      <Controls
        filters={filters} // текущее состояние фильтров
        onChange={setFilters} // обновление фильтров
        onGenerate={generateOutfit} // кнопка «Generate outfit»
        onClear={clearAll} // кнопка «Clear all»
      />

      {/* Две колонки: слева — каталог, справа — примерочная */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 420px", // левая колонка тянется, правая фикс. ширины
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Левая колонка: каталог карточек */}
        <section>
          <h3>Catalog</h3>
          {filteredItems.length === 0 ? (
            <p>No items match the selected filters.</p> // сообщение если пусто
          ) : (
            <OutfitGrid items={filteredItems} onSelect={equip} /> // сетка карточек
          )}
        </section>

        {/* Правая колонка: примерочная с аватаром и слоями одежды */}
        <aside>
          <h3>Fitting room</h3>
          <OutfitPreview
            avatarUrl="/images/models/body_rectangle.png" // пока статичный аватар; можно подставлять по user.body_shape
            selectedBySlot={selectedBySlot} // надетые вещи
            layerOrder={["bottom", "top", "outerwear"]} // порядок слоёв
            onClear={clearAll} // кнопка «Clear all» под аватаром
            width={360}
            height={640}
          />
        </aside>
      </div>
    </Layout>
  );
}
