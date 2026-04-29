import { useEffect, useState } from "react";
import { api } from "./api";
import type { Collection } from "./types";
import { NewCollectionForm } from "./components/NewCollectionForm";
import { CollectionView } from "./components/CollectionView";
import "./App.css";

function CollectionList({
  collections,
  onSelect,
  onDelete,
  onNew,
}: {
  collections: Collection[];
  onSelect: (c: Collection) => void;
  onDelete: (id: string) => void;
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
                <p className="meta">{c.scales.length} scale{c.scales.length !== 1 ? "s" : ""}</p>
                <div className="card-footer">
                  <button
                    className="danger-btn"
                    onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
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

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    api.listCollections().then(setCollections);
  }, []);

  const handleCreate = async (
    name: string,
    description: string | null,
    scaleNames: string[]
  ) => {
    const c = await api.createCollection(name, description, scaleNames);
    setCollections((prev) => [...prev, c]);
    setShowNew(false);
  };

  const handleDelete = async (id: string) => {
    await api.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="app">
      {selected ? (
        <CollectionView collection={selected} onBack={() => setSelected(null)} />
      ) : (
        <CollectionList
          collections={collections}
          onSelect={setSelected}
          onDelete={handleDelete}
          onNew={() => setShowNew(true)}
        />
      )}
      {showNew && (
        <NewCollectionForm onSubmit={handleCreate} onCancel={() => setShowNew(false)} />
      )}
    </div>
  );
}
