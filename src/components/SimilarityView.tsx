import type { Item, SimilarityResult } from "../types";

interface Props {
  anchor: Item;
  results: SimilarityResult[];
}

export function SimilarityView({ anchor, results }: Props) {
  if (results.length === 0) {
    return (
      <div className="chart-empty">
        Add more items to the collection to see similarity rankings.
      </div>
    );
  }

  const similarities = results.map((r) => r.similarity);
  const min = Math.min(...similarities);
  const max = Math.max(...similarities);
  const range = max - min || 1;

  return (
    <div className="similarity-view">
      <div className="similarity-anchor">
        <span className="similarity-anchor-label">Anchor</span>
        <span className="similarity-anchor-name">{anchor.name}</span>
      </div>
      <div className="similarity-list">
        {results.map((r) => {
          const normalized = (r.similarity - min) / range;
          return (
            <div key={r.item_id} className="similarity-row">
              <span className="similarity-name">{r.item_name}</span>
              <div className="similarity-bar-track">
                <div
                  className="similarity-bar-fill"
                  style={{ width: `${normalized * 100}%` }}
                />
              </div>
              <span className="similarity-score">{r.similarity.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
