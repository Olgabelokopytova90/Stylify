// Импортируем React и тип Filters, чтобы использовать типизацию для props
import React from "react";
import type { Filters } from "../types";

// Определяем тип Props — какие данные и функции компонент получает
type Props = {
  filters: Filters; // текущие значения фильтров (style, season, limit)
  onChange: (f: Filters) => void; // функция, которая обновляет фильтры при изменении
  onGenerate?: () => void; // опциональная функция — генерировать outfit
  onClear?: () => void; // опциональная функция — очистить фильтры
};

// Главная функция-компонент Controls
export default function Controls({
  filters,
  onChange,
  onGenerate,
  onClear,
}: Props) {
  // --- CSS стили для разных частей панели ---

  // Основная строка (контейнер), где располагаются все поля и кнопки
  const row: React.CSSProperties = {
    display: "flex", // элементы в строку
    alignItems: "flex-end", // выравнивание по нижнему краю
    gap: 12, // отступ между элементами
    flexWrap: "wrap", // если не помещаются — переносятся
    margin: "12px 0 20px", // внешние отступы
  };

  // Стиль для каждого отдельного поля (label + input)
  const field: React.CSSProperties = {
    display: "grid", // используем grid, чтобы текст и input шли вертикально
    gap: 6, // расстояние между надписью и полем
    minWidth: 160, // минимальная ширина для равномерности
  };

  // Стиль для надписей "Style", "Season", "Limit"
  const label: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.8, // немного прозрачные, чтобы не отвлекали
  };

  // Стиль для input и select
  const input: React.CSSProperties = {
    height: 36, // одинаковая высота
    padding: "6px 10px", // внутренние отступы
    borderRadius: 10, // закруглённые углы
    border: "1px solid rgba(255,255,255,.15)", // лёгкая рамка
    background: "rgba(255,255,255,.07)", // полупрозрачный фон
    color: "inherit", // наследует цвет текста от темы
  };

  // Стиль для кнопок
  const btn: React.CSSProperties = {
    height: 36, // чтобы совпадало по высоте с инпутами
    padding: "0 14px", // внутренние отступы по горизонтали
    borderRadius: 10, // закруглённые края
    fontWeight: 700, // жирный текст
    cursor: "pointer", // курсор-рука при наведении
    border: "1px solid transparent", // рамка (но прозрачная)
  };

  // Возвращаем JSX — то, что рисуется на экране
  return (
    <div style={row}>
      {/* ===== FILTER: STYLE ===== */}
      <label style={field}>
        <span style={label}>Style</span>
        <select
          value={filters.style} // текущее значение
          onChange={(e) => onChange({ ...filters, style: e.target.value })} // обновляем state
          style={input}
        >
          <option value="any">any</option>
          <option value="casual">casual</option>
          <option value="classic">classic</option>
          <option value="sport">sport</option>
        </select>
      </label>

      {/* ===== FILTER: SEASON ===== */}
      <label style={field}>
        <span style={label}>Season</span>
        <select
          value={filters.season}
          onChange={(e) => onChange({ ...filters, season: e.target.value })}
          style={input}
        >
          <option value="all">all</option>
          <option value="winter">winter</option>
          <option value="spring">spring</option>
          <option value="summer">summer</option>
          <option value="fall">fall</option>
        </select>
      </label>

      {/* ===== FILTER: LIMIT ===== */}
      <label style={field}>
        <span style={label}>Limit</span>
        <input
          type="number"
          min={1}
          value={filters.limit}
          onChange={(e) =>
            onChange({ ...filters, limit: Number(e.target.value || 1) })
          }
          style={input}
        />
      </label>

      {/* ===== BUTTONS ===== */}
      <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
        {/* Кнопка "Generate outfit" — запускает генерацию */}
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            style={{
              ...btn,
              background: "linear-gradient(135deg,#7c5cff,#19d3da)", // градиент
              color: "#0b0e1a", // тёмный текст
            }}
          >
            Generate outfit
          </button>
        )}

        {/* Кнопка "Clear all" — очищает фильтры */}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            style={{
              ...btn,
              background: "rgba(255,255,255,.08)", // полупрозрачный фон
              borderColor: "rgba(255,255,255,.15)", // светлая рамка
              color: "inherit", // цвет текста по теме
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
