import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip } from "recharts";
import type { Collection, Item } from "../types";

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      flushSync(() => {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

const COLORS = ["#818cf8", "#34d399", "#fb923c", "#f472b6", "#a78bfa"];

interface Props {
  collection: Collection;
  items: Item[];
}

export function RadarChartView({ collection, items }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useSize(containerRef);

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
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {items.length === 0 ? (
          <div className="chart-empty">Select items from the list to compare them.</div>
        ) : (
          width > 0 && height > 0 && (
            <RadarChart
              width={width}
              height={height}
              data={data}
              outerRadius="65%"
              margin={{ top: 24, right: 48, bottom: 24, left: 48 }}
            >
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
                  isAnimationActive={false}
                />
              ))}
            </RadarChart>
          )
        )}
      </div>
      {items.length > 0 && (
        <div className="chart-legend">
          {items.map((item, i) => (
            <div key={item.id} className="legend-item">
              <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
              {item.name}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
