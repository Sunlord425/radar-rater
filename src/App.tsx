import { useEffect, useState } from "react";
import { api } from "./api";
import { ToastProvider, useToast } from "./context/ToastContext";
import type { Collection } from "./types";
import { NewCollectionForm } from "./components/NewCollectionForm";
import { EditCollectionForm } from "./components/EditCollectionForm";
import { CollectionView } from "./components/CollectionView";
import "./App.css";

function CollectionList({
  collections,
  onSelect,
  onEdit,
  onDelete,
  onNew,
}: {
  collections: Collection[];
  onSelect: (c: Collection) => void;
  onEdit: (c: Collection) => void;
  onDelete: (c: Collection) => void;
  onNew: () => void;
}) {
  return (
    <>
      <div className="toolbar">
        <h1>radarRater</h1>
        <div className="toolbar-spacer" />
        <button className="primary" onClick={onNew}>
          + New Collection
        </button>
      </div>
      <div className="content">
        {collections.length === 0 ? (
          <p style={{ color: "var(--fg-muted)" }}>
            No collections yet. Create one to get started.
          </p>
        ) : (
          <div className="collection-grid">
            {collections.map((c) => (
              <div key={c.id} className="collection-card" onClick={() => onSelect(c)}>
                <h3>{c.name}</h3>
                {c.description && <p className="meta">{c.description}</p>}
                <p className="meta">
                  {c.scales.length} scale{c.scales.length !== 1 ? "s" : ""} · {c.item_count} item{c.item_count !== 1 ? "s" : ""}
                </p>
                <div className="card-footer">
                  <button
                    className="icon-btn"
                    title="Edit"
                    onClick={(e) => { e.stopPropagation(); onEdit(c); }}
                  >
                    ✎
                  </button>
                  <button
                    className="danger-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(c); }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function AppInner() {
  const { addToast } = useToast();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  useEffect(() => {
    api.listCollections().then(setCollections).catch((e) => addToast(String(e)));
  }, []);

  const handleCreate = async (name: string, description: string | null, scaleNames: string[]) => {
    try {
      const c = await api.createCollection(name, description, scaleNames);
      setCollections((prev) => [...prev, c]);
      setShowNew(false);
    } catch (e) {
      addToast(String(e));
    }
  };

  const handleUpdate = async (name: string, description: string | null) => {
    if (!editingCollection) return;
    try {
      await api.updateCollection(editingCollection.id, name, description);
      setCollections((prev) =>
        prev.map((c) => c.id === editingCollection.id ? { ...c, name, description } : c)
      );
      setEditingCollection(null);
    } catch (e) {
      addToast(String(e));
    }
  };

  const handleDelete = async (c: Collection) => {
    if (!window.confirm(`Delete "${c.name}" and all its items? This cannot be undone.`)) return;
    try {
      await api.deleteCollection(c.id);
      setCollections((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e) {
      addToast(String(e));
    }
  };

  return (
    <div className="app">
      {selected ? (
        <CollectionView collection={selected} onBack={() => setSelected(null)} />
      ) : (
        <CollectionList
          collections={collections}
          onSelect={setSelected}
          onEdit={setEditingCollection}
          onDelete={handleDelete}
          onNew={() => setShowNew(true)}
        />
      )}
      {showNew && (
        <NewCollectionForm onSubmit={handleCreate} onCancel={() => setShowNew(false)} />
      )}
      {editingCollection && (
        <EditCollectionForm
          collection={editingCollection}
          onSubmit={handleUpdate}
          onCancel={() => setEditingCollection(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
