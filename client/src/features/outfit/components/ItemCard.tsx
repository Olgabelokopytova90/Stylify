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
      background: "rgba(255, 250, 245, 0.82)",
      border: "1px solid rgba(228, 216, 204, 0.7)",
      borderRadius: "18px",
      padding: "10px",
      display: "flex",
      flexDirection: "column",
      minHeight: "auto",
      boxShadow: "0 6px 18px rgba(80, 60, 40, 0.06)",
    }}
  >
    {/* IMAGE */}
    <div
      style={{
        width: "100%",
        height: 220,
        borderRadius: 14,
        background: "rgba(243, 237, 231, 0.65)",
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
          width: "92%",
          height: "92%",
          objectFit: "contain",
        }}
      />
    </div>

    {/* CONTENT */}
    <div
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#2e2a25",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </div>

      <button
        type="button"
        onClick={() => onSelect(item)}
        style={{
          borderRadius: "999px",
          padding: "7px 14px",
          border: "none",
          background: "#2e2a25",
          color: "#fff",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Wear
      </button>
    </div>
  </div>
);
}
