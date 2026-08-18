import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';

/** Compact sparkline for subtle trend/momentum hints. */
export function Sparkline({
  data,
  height = 36,
  width = 120,
  color,
}: {
  data: number[];
  height?: number;
  width?: number;
  color?: string;
}) {
  const palette = useTheme();
  const stroke = color ?? palette.info;
  if (data.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return [x, y] as const;
  });
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const last = points[points.length - 1]!;
  return (
    <Svg width={width} height={height}>
      <Path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={last[0]} cy={last[1]} r={2.5} fill={stroke} />
    </Svg>
  );
}

export function BarChart({
  data,
  height = 160,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const palette = useTheme();
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 24;
  const gap = 8;
  const chartWidth = data.length * (barWidth + gap);

  return (
    <View>
      <Svg width={chartWidth} height={height}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 30);
          const x = i * (barWidth + gap);
          return (
            <Rect
              key={d.label + i}
              x={x}
              y={height - 30 - barHeight}
              width={barWidth}
              height={barHeight}
              rx={6}
              fill={palette.info}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {data.map((d, i) => (
          <Text
            key={d.label + i}
            style={{
              width: barWidth + gap,
              textAlign: 'center',
              fontSize: 10,
              color: palette.textSecondary,
            }}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function LineChart({
  data,
  height = 160,
  width = 320,
}: {
  data: number[];
  height?: number;
  width?: number;
}) {
  const palette = useTheme();
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 10 - ((v - min) / range) * (height - 20);
    return `${x},${y}`;
  });

  return (
    <Svg width={width} height={height}>
      <Line x1={0} y1={height - 10} x2={width} y2={height - 10} stroke={palette.border} strokeWidth={1} />
      <Path d={`M ${points.join(' L ')}`} fill="none" stroke={palette.info} strokeWidth={2.5} />
      {data.map((v, i) => {
        const [x, y] = points[i]!.split(',').map(Number);
        return <Circle key={i} cx={x} cy={y} r={3} fill={palette.info} />;
      })}
    </Svg>
  );
}

export function DonutChart({
  segments,
  size = 140,
}: {
  segments: { label: string; value: number; color?: string }[];
  size?: number;
}) {
  const palette = useTheme();
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) return null;

  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -90;
  const paths: { d: string; color: string }[] = [];

  for (const seg of segments) {
    const sweep = (seg.value / total) * 360;
    const start = angle;
    const end = angle + sweep;
    const d = describeArc(cx, cy, r, start, end);
    paths.push({ d, color: seg.color ?? palette.info });
    angle = end;
  }

  return (
    <Svg width={size} height={size}>
      {paths.map((p, i) => (
        <Path key={i} d={p.d} fill={p.color} />
      ))}
    </Svg>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}