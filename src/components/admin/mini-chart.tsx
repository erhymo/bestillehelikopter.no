"use client";

/**
 * Small dependency-free SVG charts for the admin dashboard. Deliberately
 * hand-rolled instead of pulling in a charting library — the data here is
 * a handful of points per series, not worth the bundle weight.
 */

const CHART_HEIGHT = 140;
const CHART_WIDTH = 600;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 24;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

interface BarSeries {
  name: string;
  color: string;
  data: number[];
}

interface MiniBarChartProps {
  labels: string[];
  series: BarSeries[];
}

export function MiniBarChart({ labels, series }: MiniBarChartProps) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const groupWidth = CHART_WIDTH / Math.max(1, labels.length);
  const barGap = 3;
  const barWidth = (groupWidth - barGap * (series.length + 1)) / series.length;

  return (
    <div>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img">
        {/* baseline */}
        <line
          x1={0}
          y1={PADDING_TOP + PLOT_HEIGHT}
          x2={CHART_WIDTH}
          y2={PADDING_TOP + PLOT_HEIGHT}
          stroke="#e5e7eb"
        />
        {labels.map((label, i) => {
          const groupX = i * groupWidth;
          return (
            <g key={label}>
              {series.map((s, si) => {
                const value = s.data[i] ?? 0;
                const barHeight = (value / max) * PLOT_HEIGHT;
                const x = groupX + barGap + si * (barWidth + barGap);
                const y = PADDING_TOP + PLOT_HEIGHT - barHeight;
                return (
                  <rect
                    key={s.name}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={s.color}
                    rx={1.5}
                  >
                    <title>
                      {label} · {s.name}: {value}
                    </title>
                  </rect>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                fontSize="9"
                fill="#6b7280"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

interface MiniLineChartProps {
  labels: string[];
  data: number[];
  color?: string;
}

const LINE_PADDING_X = 16; // keeps edge point labels from clipping outside the viewBox

export function MiniLineChart({ labels, data, color = "#1e3a5f" }: MiniLineChartProps) {
  const max = Math.max(1, ...data);
  const plotWidth = CHART_WIDTH - LINE_PADDING_X * 2;
  const stepX = plotWidth / Math.max(1, labels.length - 1 || 1);

  const points = data.map((value, i) => {
    const x = labels.length > 1 ? LINE_PADDING_X + i * stepX : CHART_WIDTH / 2;
    const y = PADDING_TOP + PLOT_HEIGHT - (value / max) * PLOT_HEIGHT;
    return { x, y, value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? 0},${PADDING_TOP + PLOT_HEIGHT} L${points[0]?.x ?? 0},${PADDING_TOP + PLOT_HEIGHT} Z`;

  return (
    <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full" role="img">
      <line
        x1={0}
        y1={PADDING_TOP + PLOT_HEIGHT}
        x2={CHART_WIDTH}
        y2={PADDING_TOP + PLOT_HEIGHT}
        stroke="#e5e7eb"
      />
      <path d={areaPath} fill={color} fillOpacity={0.08} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={labels[i]}>
          <circle cx={p.x} cy={p.y} r={2.5} fill={color}>
            <title>
              {labels[i]}: {p.value}
            </title>
          </circle>
          <text x={p.x} y={CHART_HEIGHT - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}
