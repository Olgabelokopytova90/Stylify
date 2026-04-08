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
    // Обёртка карточки
    <div
      style={{
        border: "1px solid #e5e7eb", // светлая рамка вокруг карточки
        borderRadius: 12, // скруглённые углы
        padding: 10, // внутренние отступы
        display: "flex", // используем flexbox
        flexDirection: "column", // элементы располагаются вертикально
        gap: 8, // расстояние между элементами
        background: "#fff", // белый фон карточки
      }}
    >
      {/* Контейнер для изображения */}
      <div
        style={{
          width: "100%", // занимает всю ширину карточки
          height: 200, // фиксированная высота (чтобы карточки были одинаковые)
          borderRadius: 10, // скруглённые углы
          background: "#f5f5f7", // серый фон (если изображение не загрузилось)
          display: "flex", // выравниваем изображение по центру
          alignItems: "center", // по вертикали по центру
          justifyContent: "center", // по горизонтали по центру
          overflow: "hidden", // чтобы изображение не выходило за края
        }}
      >
        {/* Само изображение вещи */}
        <img
          src={image} // путь к изображению
          alt={name} // альтернативный текст для доступности
          draggable={false} // запрещаем перетаскивание картинки
          style={{
            width: "100%", // занимает всю ширину контейнера
            height: "100%", // и всю высоту
            objectFit: "contain", // изображение полностью видно, не обрезается
          }}
        />
      </div>

      {/* Название вещи */}
      <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>

      {/* Категория (top, bottom, outerwear и т.д.) */}
      <small style={{ opacity: 0.6 }}>{category}</small>

      {/* Кнопка "Wear" — при нажатии вызывает функцию onSelect */}
      <button
        type="button"
        onClick={() => onSelect(item)} // передаём выбранную вещь наверх (в OutfitPreview)
        style={{
          width: "100%", // занимает всю ширину карточки
          borderRadius: 8, // закруглённые углы
          padding: "10px 12px", // внутренние отступы
          border: "1px solid #111", // чёрная рамка
          background: "#111", // чёрный фон
          color: "#fff", // белый текст
          fontWeight: 600, // жирное начертание
          cursor: "pointer", // курсор-рука при наведении
          marginTop: 6, // небольшой отступ сверху
        }}
      >
        Wear
      </button>
    </div>
  );
}
