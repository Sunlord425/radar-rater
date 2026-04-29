import { useState } from "react";

interface Props {
  onSubmit: (name: string, description: string | null, scaleNames: string[]) => void;
  onCancel: () => void;
}

export function NewCollectionForm({ onSubmit, onCancel }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scales, setScales] = useState<string[]>(["", ""]);

  const addScale = () => setScales((s) => [...s, ""]);
  const removeScale = (i: number) => setScales((s) => s.filter((_, idx) => idx !== i));
  const updateScale = (i: number, val: string) =>
    setScales((s) => s.map((v, idx) => (idx === i ? val : v)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validScales = scales.map((s) => s.trim()).filter(Boolean);
    if (!name.trim() || validScales.length === 0) return;
    onSubmit(name.trim(), description.trim() || null, validScales);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Collection</h2>
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="form-field">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Films"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you rating?"
            />
          </div>
          <div className="form-field">
            <label>Scales</label>
            <div className="scale-list">
              {scales.map((scale, i) => (
                <div key={i} className="scale-row">
                  <input
                    type="text"
                    value={scale}
                    onChange={(e) => updateScale(i, e.target.value)}
                    placeholder={`Scale ${i + 1}`}
                  />
                  {scales.length > 1 && (
                    <button type="button" className="danger-btn" onClick={() => removeScale(i)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="ghost" onClick={addScale}>
                + Add Scale
              </button>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
