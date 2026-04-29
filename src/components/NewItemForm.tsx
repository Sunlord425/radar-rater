import { useState } from "react";
import type { Collection, Rating } from "../types";

interface Props {
  collection: Collection;
  onSubmit: (name: string, description: string | null, ratings: Rating[]) => void;
  onCancel: () => void;
}

export function NewItemForm({ collection, onSubmit, onCancel }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(collection.scales.map((s) => [s.id, 5]))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ratings: Rating[] = collection.scales.map((s) => ({
      scale_id: s.id,
      value: values[s.id],
    }));
    onSubmit(name.trim(), description.trim() || null, ratings);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Item</h2>
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="form-field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blade Runner 2049"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any notes?"
            />
          </div>
          <div className="form-field">
            <label>Ratings</label>
            <div className="scale-list">
              {collection.scales.map((scale) => (
                <div key={scale.id} className="slider-field">
                  <div className="slider-header">
                    <span className="scale-label">{scale.name}</span>
                    <span className="scale-value">{values[scale.id].toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.1}
                    value={values[scale.id]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [scale.id]: parseFloat(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
