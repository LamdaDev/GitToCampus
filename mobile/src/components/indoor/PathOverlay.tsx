import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import type { IndoorNode } from '../../utils/indoor/indoorPathFinding';

const getDotColor = (node: IndoorNode, isStart: boolean, isEnd: boolean) => {
    if (isStart) return '#00C851';
    if (isEnd) return '#FF4444';
    if (node.type === 'elevator_door') return '#FF9500';
    if (node.type === 'stair_landing') return '#9B59B6';
    if (node.type === 'doorway') return '#00BFFF';
    return '#0057FF';
};

type Props = {
    pathNodes: IndoorNode[];
    planType: 'svg' | 'png' | undefined;
    allNodes: IndoorNode[];
    svgViewBox?: { width: number; height: number };
};

export default function PathOverlay({ pathNodes, planType, allNodes, svgViewBox }: Props) {
    if (pathNodes.length < 2) return null;

    const xs = allNodes.map(n => n.x);
    const ys = allNodes.map(n => n.y);
    const nodeMaxX = xs.length > 0 ? Math.max(...xs) : 2100;
    const nodeMaxY = ys.length > 0 ? Math.max(...ys) : 2100;

    const viewWidth = svgViewBox?.width ?? nodeMaxX + 200;
    const viewHeight = svgViewBox?.height ?? nodeMaxY + 200;
    const scaleX = svgViewBox ? svgViewBox.width / nodeMaxX : 1;
    const scaleY = svgViewBox ? svgViewBox.height / nodeMaxY : 1;

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
                            strokeWidth={8}
                            strokeDasharray="16,10"
                            strokeOpacity={0.7}
                            strokeLinecap="round"
                        />
                    );
                })}

                {pathNodes.map((node, i) => {
                    const isStart = i === 0;
                    const isEnd = i === pathNodes.length - 1;
                    return (
                        <Circle
                            key={`dot-${node.id}`}
                            cx={node.x * scaleX}
                            cy={node.y * scaleY}
                            r={isStart || isEnd ? 24 : 10}
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