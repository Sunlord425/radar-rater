import { useEffect, useState } from "react";
import { api } from "../api";
import type { Collection, Item, Rating } from "../types";
import { NewItemForm } from "./NewItemForm";
import { RadarChartView } from "./RadarChartView";

interface Props {
  collection: Collection;
  onBack: () => void;
}

export function CollectionView({ collection, onBack }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewItem, setShowNewItem] = useState(false);

  useEffect(() => {
    api.listItems(collection.id).then(setItems);
    setSelectedIds(new Set());
  }, [collection.id]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleCreateItem = async (
    name: string,
    description: string | null,
    ratings: Rating[]
  ) => {
    const item = await api.createItem(collection.id, name, description, ratings);
    setItems((prev) => [...prev, item]);
    setSelectedIds((prev) => new Set(prev).add(item.id));
    setShowNewItem(false);
  };

  const selectedItems = items.filter((i) => selectedIds.has(i.id));

  return (
    <>
      <div className="toolbar">
        <button className="back" onClick={onBack}>← Collections</button>
        <h1>{collection.name}</h1>
        <span style={{ fontSize: "0.8rem", color: "var(--fg-muted)" }}>
          {collection.scales.map((s) => s.name).join(" · ")}
        </span>
        <div className="toolbar-spacer" />
        <button className="primary" onClick={() => setShowNewItem(true)}>
          + Add Item
        </button>
      </div>

      <div className="content">
        <div className="collection-view">
          <div className="items-panel">
            {items.length === 0 && (
              <p style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>
                No items yet. Add one to get started.
              </p>
            )}
            {items.map((item) => (
              <div
                key={item.id}
                className={`item-card${selectedIds.has(item.id) ? " selected" : ""}`}
                onClick={() => toggleSelect(item.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelect(item.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  {item.description && (
                    <div className="item-desc">{item.description}</div>
                  )}
                </div>
                <button
                  className="danger-btn"
                  onClick={(e) => handleDeleteItem(item.id, e)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="chart-panel">
            <RadarChartView collection={collection} items={selectedItems} />
          </div>
        </div>
      </div>

      {showNewItem && (
        <NewItemForm
          collection={collection}
          onSubmit={handleCreateItem}
          onCancel={() => setShowNewItem(false)}
        />
      )}
    </>
  );
}
