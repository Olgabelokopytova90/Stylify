import type { Item } from "../types";
import ItemCard from "./ItemCard";

interface Props {
  items?: Item[];
  onSelect: (item: Item) => void;
}

export default function OutfitGrid({ items = [], onSelect }: Props) {
  console.log("OutfitGrid items:", items);

    if (items.length === 0) {
    return <p style={{ color: "white" }}>No items found</p>;
    }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
      }}
    >
      {items.map((item) => (
        <ItemCard
          key={`${item.category}_${item.id}_${item.image}`}
          item={item}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
