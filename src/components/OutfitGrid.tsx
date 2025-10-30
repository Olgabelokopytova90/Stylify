// Импортируем тип Item, чтобы точно знать, какие данные приходят в массив items
import type { Item } from "../types";

// Импортируем компонент ItemCard — каждая вещь (одежда) будет отображаться именно через него
import ItemCard from "./ItemCard";

// Определяем интерфейс Props — какие параметры принимает OutfitGrid
interface Props {
  items: Item[]; // массив вещей (например, tops, bottoms, outerwear)
  onSelect: (item: Item) => void; // функция, которая вызывается при нажатии на кнопку "Wear"
}

// Главная функция — сам компонент OutfitGrid
export default function OutfitGrid({ items, onSelect }: Props) {
  return (
    // Контейнер для сетки карточек
    <div
      style={{
        display: "grid", // используем CSS Grid Layout
        gridTemplateColumns: "repeat(3, 1fr)", // 3 колонки равной ширины
        gap: 12, // отступ между карточками (в пикселях)
      }}
    >
      {/* items.map(...) — проходим по каждому элементу массива items */}
      {items.map((item) => (
        // Для каждой вещи создаём компонент ItemCard
        <ItemCard
          key={`${item.category}_${item.id}_${item.image}`} // уникальный ключ для React
          item={item} // передаём сам объект с вещью (имя, категория, картинка)
          onSelect={onSelect} // передаём функцию — вызывается при клике "Wear"
        />
      ))}
    </div>
  );
}
