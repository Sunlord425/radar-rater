import { useState } from "react";
import type { Collection } from "../types";

interface Props {
  collection: Collection;
  onSubmit: (name: string, description: string | null) => void;
  onCancel: () => void;
}

export function EditCollectionForm({ collection, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim() || null);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Collection</h2>
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="form-field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
