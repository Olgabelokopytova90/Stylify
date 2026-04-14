// Импортируем тип Item, который описывает структуру объекта одежды
// (например: { id, name, image, category, color, season, ... })
import type { Item } from "../types";

// Описываем интерфейс Props — какие свойства получает этот компонент
interface Props {
  item: Item; // один объект вещи (например, "white sweater")
  onSelect: (item: Item) => void; // функция, которая вызывается, когда пользователь нажимает "Wear"
}

// Создаём функциональный React-компонент ItemCard
// который отображает карточку вещи в каталоге
export default function ItemCard({ item, onSelect }: Props) {
  // Деструктурируем нужные поля из объекта item
  // чтобы не писать каждый раз item.name, item.image, item.category
  const { name, image, category } = item;

  // Возвращаем JSX — визуальную часть компонента
  console.log("ItemCard image:", item.image);
return (
  <div
    style={{
  background: "#fffaf5",
  border: "1px solid #e4d8cc",
  borderRadius: "18px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  minHeight: "280px",
}}
  >
    {/* IMAGE */}
    <div
      style={{
        width: "100%",
        height: 220,
        borderRadius: 12,
        background: "#f3ede7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src={image}
        alt={name}
        draggable={false}
        style={{
          width: "90%",            // 🔥 НЕ 100% — выглядит аккуратнее
          height: "100%",          // 🔥 теперь привязано к контейнеру
          objectFit: "contain",
        }}
      />
    </div>

    {/* CONTENT */}
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 12, color: "#8a817c", marginTop: 4 }}>
        {category}
      </div>
    </div>

    {/* BUTTON */}
    <button
      type="button"
      onClick={() => onSelect(item)}
      style={{
        width: "100%",
        borderRadius: 10,
        padding: "12px",
        border: "none",
        background: "#1a1a1a",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer",
        marginTop: 12,
      }}
    >
      Wear
    </button>
  </div>
);
}
