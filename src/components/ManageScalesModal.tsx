import { useState } from "react";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import type { Scale } from "../types";

interface DraftScale {
  id: string;
  name: string;
  isNew: boolean;
  deleted: boolean;
}

interface Props {
  collectionId: string;
  initialScales: Scale[];
  onSave: (scales: Scale[]) => void;
  onCancel: () => void;
}

export function ManageScalesModal({ collectionId, initialScales, onSave, onCancel }: Props) {
  const { addToast } = useToast();
  const [drafts, setDrafts] = useState<DraftScale[]>(
    initialScales.map((s) => ({ id: s.id, name: s.name, isNew: false, deleted: false }))
  );
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const visible = drafts.filter((d) => !d.deleted);

  const updateName = (id: string, name: string) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));

  const markDeleted = (id: string) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, deleted: true } : d)));

  const moveUp = (index: number) => {
    if (index === 0) return;
    setDrafts((prev) => {
      const next = prev.filter((d) => !d.deleted);
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index === visible.length - 1) return;
    setDrafts((prev) => {
      const next = prev.filter((d) => !d.deleted);
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const addScale = () => {
    const name = newName.trim();
    if (!name) return;
    setDrafts((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name, isNew: true, deleted: false },
    ]);
    setNewName("");
  };

  const handleSave = async () => {
    if (visible.some((d) => !d.name.trim())) {
      addToast("Scale names cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      for (const d of drafts) {
        if (d.deleted && !d.isNew) {
          await api.deleteScale(d.id);
        }
      }

      const surviving = visible.filter((d) => !d.isNew);
      const renamed = surviving.filter((d) => {
        const orig = initialScales.find((s) => s.id === d.id);
        return orig && orig.name !== d.name.trim();
      });
      for (const d of renamed) {
        await api.renameScale(d.id, d.name.trim());
      }

      const existingIds = visible.filter((d) => !d.isNew).map((d) => d.id);
      if (existingIds.length > 0) {
        await api.reorderScales(existingIds);
      }

      const added: Scale[] = [];
      for (const d of visible.filter((d) => d.isNew)) {
        const scale = await api.addScale(collectionId, d.name.trim());
        added.push(scale);
      }

      const finalScales: Scale[] = [
        ...visible
          .filter((d) => !d.isNew)
          .map((d, i) => ({ id: d.id, name: d.name.trim(), order_index: i })),
        ...added,
      ];

      onSave(finalScales);
    } catch (e) {
      addToast(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Manage Scales</h2>

        <div className="form-field">
          <label>Scales</label>
          <div className="scale-list">
            {visible.map((d, i) => (
              <div key={d.id} className="scale-row">
                <div className="reorder-btns">
                  <button type="button" className="icon-btn" onClick={() => moveUp(i)} disabled={i === 0}>↑</button>
                  <button type="button" className="icon-btn" onClick={() => moveDown(i)} disabled={i === visible.length - 1}>↓</button>
                </div>
                <input
                  type="text"
                  value={d.name}
                  onChange={(e) => updateName(d.id, e.target.value)}
                />
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => {
                    if (!window.confirm(`Remove scale "${d.name}"? All ratings for this scale will be lost.`)) return;
                    markDeleted(d.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Add Scale</label>
          {visible.length > 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--fg-muted)", marginBottom: 4 }}>
              Existing items will receive a default rating of 5.0 for any new scale.
            </p>
          )}
          <div className="scale-row">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Scale name"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addScale(); }}}
            />
            <button type="button" className="ghost" onClick={addScale}>+ Add</button>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
