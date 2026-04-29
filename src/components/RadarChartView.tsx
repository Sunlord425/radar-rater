import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Collection, Item } from "../types";

const COLORS = ["#818cf8", "#34d399", "#fb923c", "#f472b6", "#a78bfa"];

interface Props {
  collection: Collection;
  items: Item[];
}

export function RadarChartView({ collection, items }: Props) {
  if (items.length === 0) {
    return <p className="chart-empty">Select items from the list to compare them.</p>;
  }

  const data = collection.scales.map((scale) => {
    const point: Record<string, string | number> = { scale: scale.name };
    for (const item of items) {
      const rating = item.ratings.find((r) => r.scale_id === scale.id);
      point[item.id] = rating?.value ?? 0;
    }
    return point;
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="scale" tick={{ fontSize: 12 }} />
          <Tooltip formatter={(val) => (typeof val === "number" ? val.toFixed(1) : val)} />
          {items.map((item, i) => (
            <Radar
              key={item.id}
              name={item.name}
              dataKey={item.id}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        {items.map((item, i) => (
          <div key={item.id} className="legend-item">
            <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            {item.name}
          </div>
        ))}
      </div>
    </>
  );
}
