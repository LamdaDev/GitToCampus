import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import type { IndoorNode } from '../../utils/indoor/indoorPathFinding';
import { getDotColor } from '../../constants/indoorPathDotColors';

type PathOverlayProps = {
  pathNodes: IndoorNode[];
  planType: 'svg' | 'png' | undefined;
  svgViewBox?: { width: number; height: number };
  nodeSpace?: { width: number; height: number };
};

// ── overlay that draws the path on top of the floor plan ─────────────────
export default function PathOverlay({
  pathNodes,
  planType,
  svgViewBox,
  nodeSpace,
}: Readonly<PathOverlayProps>) {
  if (pathNodes.length < 2) return null;

  const viewWidth = svgViewBox?.width ?? 1024;
  const viewHeight = svgViewBox?.height ?? 1024;

  // ── Scale node coordinates to match the SVG viewbox ──────────────────────────
  const scaleX = svgViewBox && nodeSpace ? svgViewBox.width / nodeSpace.width : 1;
  const scaleY = svgViewBox && nodeSpace ? svgViewBox.height / nodeSpace.height : 1;

  const size = planType === 'png' ? 1000 : ('100%' as const);

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      width={size}
      height={size}
      pointerEvents="none"
    >
      <G>
        {/* ── Dashed lines connecting each node ── */}
        {pathNodes.map((node, i) => {
          if (i === 0) return null;
          const prev = pathNodes[i - 1];
          return (
            <Line
              key={`line-${node.id}`}
              x1={prev.x * scaleX}
              y1={prev.y * scaleY}
              x2={node.x * scaleX}
              y2={node.y * scaleY}
              stroke="#0057FF"
              strokeWidth={4}
              strokeDasharray="6,6"
              strokeOpacity={1}
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Colored dots at each node ── */}
        {pathNodes.map((node, i) => {
          const isStart = i === 0;
          const isEnd = i === pathNodes.length - 1;
          return (
            <Circle
              key={`dot-${node.id}`}
              cx={node.x * scaleX}
              cy={node.y * scaleY}
              r={isStart || isEnd ? 10 : 0}
              fill={getDotColor(node, isStart, isEnd)}
              stroke="#fff"
              strokeWidth={isStart || isEnd ? 5 : 2}
            />
          );
        })}
      </G>
    </Svg>
  );
}
