import { useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import type { Collection, Item, Rating, Scale, SimilarityResult } from "../types";
import { NewItemForm } from "./NewItemForm";
import { ManageScalesModal } from "./ManageScalesModal";
import { RadarChartView } from "./RadarChartView";
import { SimilarityView } from "./SimilarityView";

type PanelMode = "compare" | "similarity";

interface Props {
  collection: Collection;
  onBack: () => void;
}

export function CollectionView({ collection, onBack }: Props) {
  const { addToast } = useToast();
  const [scales, setScales] = useState<Scale[]>(collection.scales);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showManageScales, setShowManageScales] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("compare");
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [similarityResults, setSimilarityResults] = useState<SimilarityResult[]>([]);

  useEffect(() => {
    api.listItems(collection.id).then(setItems).catch((e) => addToast(e));
    setSelectedIds(new Set());
    setAnchorId(null);
    setSimilarityResults([]);
  }, [collection.id]);

  useEffect(() => {
    if (panelMode !== "similarity" || !anchorId) return;
    api
      .rankBySimilarity(collection.id, anchorId)
      .then(setSimilarityResults)
      .catch((e) => addToast(e));
  }, [panelMode, anchorId, collection.id]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleItemClick = (id: string) => {
    if (panelMode === "compare") toggleSelect(id);
    else setAnchorId(id);
  };

  const handleDeleteItem = async (item: Item, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      if (anchorId === item.id) setAnchorId(null);
    } catch (e) {
      addToast(String(e));
    }
  };

  const handleCreateItem = async (
    name: string,
    description: string | null,
    ratings: Rating[]
  ) => {
    try {
      const item = await api.createItem(collection.id, name, description, ratings);
      setItems((prev) => [...prev, item]);
      if (panelMode === "compare") setSelectedIds((prev) => new Set(prev).add(item.id));
      setShowNewItem(false);
    } catch (e) {
      addToast(String(e));
    }
  };

  const handleUpdateItem = async (
    name: string,
    description: string | null,
    ratings: Rating[]
  ) => {
    if (!editingItem) return;
    try {
      const updated = await api.updateItem(editingItem.id, name, description, ratings);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (anchorId === editingItem.id) {
        api.rankBySimilarity(collection.id, anchorId).then(setSimilarityResults).catch((e) => addToast(e));
      }
      setEditingItem(null);
    } catch (e) {
      addToast(String(e));
    }
  };

  const collectionWithScales = { ...collection, scales };
  const filteredItems = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.description?.toLowerCase().includes(search.toLowerCase()))
    : items;
  const selectedItems = filteredItems.filter((i) => selectedIds.has(i.id));
  const anchorItem = items.find((i) => i.id === anchorId) ?? null;
  const isActive = (id: string) =>
    panelMode === "compare" ? selectedIds.has(id) : anchorId === id;

  return (
    <>
      <div className="toolbar">
        <button className="back" onClick={onBack}>← Collections</button>
        <h1>{collection.name}</h1>
        <span style={{ fontSize: "0.8rem", color: "var(--fg-muted)" }}>
          {scales.map((s) => s.name).join(" · ")}
        </span>
        <div className="toolbar-spacer" />
        <button className="ghost" onClick={() => setShowManageScales(true)}>
          Scales
        </button>
        <button className="primary" onClick={() => setShowNewItem(true)}>
          + Add Item
        </button>
      </div>

      <div className="content">
        <div className="collection-view">
          <div className="items-panel">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              style={{ flexShrink: 0 }}
            />
            {items.length === 0 && (
              <p style={{ color: "var(--fg-muted)", fontSize: "0.9rem" }}>
                No items yet. Add one to get started.
              </p>
            )}
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`item-card${isActive(item.id) ? " selected" : ""}`}
                onClick={() => handleItemClick(item.id)}
              >
                {panelMode === "compare" ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <input
                    type="radio"
                    name="anchor"
                    checked={anchorId === item.id}
                    onChange={() => setAnchorId(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  {item.description && (
                    <div className="item-desc">{item.description}</div>
                  )}
                </div>
                <button
                  className="icon-btn"
                  title="Edit"
                  onClick={(e) => { e.stopPropagation(); setEditingItem(item); }}
                >
                  ✎
                </button>
                <button
                  className="danger-btn"
                  title="Delete"
                  onClick={(e) => handleDeleteItem(item, e)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="chart-panel">
            <div className="panel-tabs">
              <button
                className={`tab${panelMode === "compare" ? " active" : ""}`}
                onClick={() => setPanelMode("compare")}
              >
                Compare
              </button>
              <button
                className={`tab${panelMode === "similarity" ? " active" : ""}`}
                onClick={() => setPanelMode("similarity")}
              >
                Similarity
              </button>
            </div>

            {panelMode === "compare" ? (
              <RadarChartView collection={collectionWithScales} items={selectedItems} />
            ) : anchorItem ? (
              <SimilarityView anchor={anchorItem} results={similarityResults} />
            ) : (
              <div className="chart-empty">
                Select an item from the list to rank all others by similarity.
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewItem && (
        <NewItemForm
          collection={collectionWithScales}
          onSubmit={handleCreateItem}
          onCancel={() => setShowNewItem(false)}
        />
      )}
      {editingItem && (
        <NewItemForm
          collection={collectionWithScales}
          initialItem={editingItem}
          onSubmit={handleUpdateItem}
          onCancel={() => setEditingItem(null)}
        />
      )}
      {showManageScales && (
        <ManageScalesModal
          collectionId={collection.id}
          initialScales={scales}
          onSave={(updated) => { setScales(updated); setShowManageScales(false); }}
          onCancel={() => setShowManageScales(false)}
        />
      )}
    </>
  );
}
