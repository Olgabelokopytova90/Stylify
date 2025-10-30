// Импортируем типы для строгой типизации пропсов
import type { Item, Slot, SelectedBySlot } from "../types";

// Описываем, какие пропсы принимает компонент
interface Props {
  avatarUrl: string; // URL базового аватара (по типу фигуры)
  selectedBySlot: SelectedBySlot; // надетые вещи по слотам: { top?, bottom?, outerwear?, shoes? }
  layerOrder: Slot[]; // порядок рисования слоёв (например: ["bottom","top","outerwear"])
  onClear: () => void; // обработчик для кнопки «Clear all»
  width?: number; // ширина «холста» примерочной (по умолчанию 360)
  height?: number; // высота «холста» (по умолчанию 640)
}

// --- Преднастройки области размещения одежды (в процентах от размеров холста) ---
const SLOT_RECT = {
  // Слот "top" — свитер, футболка, блузка
  top: {
    top: 11, // отступ сверху (проценты от высоты холста) — чуть ниже шеи
    left: 10, // отступ слева — чтобы визуально центрировать
    width: 80, // ширина области под вещь (проценты от ширины холста)
    height: 55, // высота области — примерно до талии
  },

  // Слот "bottom" — брюки, юбка
  bottom: {
    top: 34, // стартуем от талии
    left: 10, // центр
    width: 81,
    height: 66, // длина до щиколоток (зависит от пропорций аватара)
  },

  // Слот "outerwear" — пальто/куртка (идёт поверх top)
  outerwear: {
    top: 6.5,
    left: 10,
    width: 80,
    height: 55,
  },
} as const;

// Отдельная область для "платья" (которое покрывает и верх, и низ)
const DRESS_RECT = {
  top: 12,
  left: 1, // можно подправить на 10, если нужно ровно по центру как у top
  width: 80,
  height: 70,
};

// Вспомогательная функция: это платье?
function isDress(item: Item) {
  return /dress/i.test(item.name); // ищем "dress" в имени вещи (регистр не важен)
}

// Главный компонент «примерочной»
export default function OutfitPreview({
  avatarUrl,
  selectedBySlot,
  layerOrder,
  onClear,
  width = 360, // дефолтная ширина холста, если не передали
  height = 640, // дефолтная высота холста
}: Props) {
  // Утилита: конвертируем проценты в пиксели относительно width/height
  const toPx = (p: number, total: number) => (p / 100) * total;

  return (
    // Внешний контейнер — центрируем содержимое и держим кнопку снизу
    <div style={{ textAlign: "center" }}>
      {/* Сам «холст» (канвас) примерочной */}
      <div
        style={{
          position: "relative", // позволяем абсолютное позиционирование внутри
          width, // используем проп width
          height, // и проп height
          border: "1px solid #ccc",
          borderRadius: 10,
          overflow: "hidden", // обрезаем всё, что выходит за края
          background: "#fafafa", // нейтральный фон
        }}
      >
        {/* Базовый аватар — лежит в нулевом слое (под одеждой) */}
        <img
          src={avatarUrl}
          alt="avatar"
          style={{
            position: "absolute", // занимает всю область холста
            inset: 0, // top/right/bottom/left = 0
            width: "100%",
            height: "100%",
            objectFit: "contain", // целиком помещается, не обрезается
            zIndex: 0, // под слоями одежды
          }}
        />

        {/* Рендер слоёв одежды в заданном порядке */}
        {layerOrder.map((slot, i) => {
          const item = selectedBySlot[slot]; // берём вещь для текущего слота
          if (!item) return null; // если ничего не надето — пропускаем

          // Если это "top" и вещь — платье, используем прямоугольник для платья
          const rect =
            slot === "top" && isDress(item)
              ? DRESS_RECT
              : SLOT_RECT[slot as keyof typeof SLOT_RECT]; // иначе — преднастройки для слота

          if (!rect) return null; // на случай, если слота нет в преднастройках

          // Пересчитываем проценты в пиксели под текущий холст
          const box = {
            position: "absolute" as const,
            top: toPx(rect.top, height),
            left: toPx(rect.left, width),
            width: toPx(rect.width, width),
            height: toPx(rect.height, height),
            zIndex: i + 1, // одежда всегда поверх аватара; i даёт правильный порядок
          };

          // Рисуем контейнер вещи и саму картинку внутри
          return (
            <div key={`${slot}_${item.id}`} style={box}>
              <img
                src={item.image}
                alt={item.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain", // вписываем вещь в область без обрезки
                  objectPosition: "center",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Отдельный вывод обуви (по требованиям MVP — рядом, не на аватаре) */}
      {selectedBySlot.shoes && (
        <div style={{ marginTop: 12 }}>
          <img
            src={selectedBySlot.shoes.image}
            alt={selectedBySlot.shoes.name}
            style={{
              width: 90,
              height: 90,
              objectFit: "contain",
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
      )}

      {/* Кнопка «Clear all» — снимает всю одежду */}
      <button
        onClick={onClear}
        style={{
          marginTop: 12,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #aaa",
          background: "#fff",
          cursor: "pointer",
        }}
      >
        Clear all
      </button>
    </div>
  );
}
