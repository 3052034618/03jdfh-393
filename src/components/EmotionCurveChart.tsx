import type { EmotionPoint } from '@/types';
import { emotionLabel } from '@/utils/diagnosis';
import { emotionOptions } from '@/store/blueprintStore';

interface EmotionCurveChartProps {
  points: EmotionPoint[];
}

export default function EmotionCurveChart({ points }: EmotionCurveChartProps) {
  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm border border-dashed border-border-subtle">
        暂无数据，请先录入房间
      </div>
    );
  }

  const width = 800;
  const height = 260;
  const padding = { top: 30, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxY = 5;
  const xStep = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const getPointX = (index: number) => padding.left + index * xStep;
  const getPointY = (value: number) => padding.top + chartHeight - (value / maxY) * chartHeight;

  const pathData = points
    .map((p, i) => {
      const x = getPointX(i);
      const y = getPointY(p.value);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath =
    pathData +
    ` L ${getPointX(points.length - 1).toFixed(1)} ${padding.top + chartHeight} L ${getPointX(0).toFixed(1)} ${padding.top + chartHeight} Z`;

  const yLabels = [
    { value: 0, label: '释然' },
    { value: 2, label: '不安' },
    { value: 3, label: '怀疑' },
    { value: 5, label: '压迫' },
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ minWidth: '600px' }}
      >
        <defs>
          <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b2635" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b2635" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yLabels.map((yl) => (
          <g key={yl.value}>
            <line
              x1={padding.left}
              y1={getPointY(yl.value)}
              x2={width - padding.right}
              y2={getPointY(yl.value)}
              stroke="#2e2e38"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={getPointY(yl.value) + 4}
              textAnchor="end"
              fill="#6b6865"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {yl.label}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#curveGradient)" />

        <path
          d={pathData}
          fill="none"
          stroke="#c9a962"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => {
          const colorConfig = emotionOptions.find((e) => e.value === p.emotion);
          return (
            <g key={p.roomId}>
              <circle
                cx={getPointX(i)}
                cy={getPointY(p.value)}
                r="5"
                fill="#1a1a1f"
                stroke={colorConfig?.color || '#c9a962'}
                strokeWidth="2"
              />
              <circle
                cx={getPointX(i)}
                cy={getPointY(p.value)}
                r="2"
                fill={colorConfig?.color || '#c9a962'}
              />
              <text
                x={getPointX(i)}
                y={height - padding.bottom + 18}
                textAnchor="middle"
                fill="#a8a4a0"
                fontSize="10"
                fontFamily="Inter, sans-serif"
              >
                {p.roomName.length > 6 ? p.roomName.slice(0, 6) + '…' : p.roomName}
              </text>
              <text
                x={getPointX(i)}
                y={height - padding.bottom + 32}
                textAnchor="middle"
                fill={colorConfig?.color || '#6b6865'}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
              >
                {emotionLabel[p.emotion]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
