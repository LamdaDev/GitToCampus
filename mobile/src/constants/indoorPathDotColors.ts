
import type { IndoorNode } from '../utils/indoor/indoorPathFinding';

export const getDotColor = (node: IndoorNode, isStart: boolean, isEnd: boolean) => {
  if (isStart) return '#00C851';
  if (isEnd) return '#FF4444';
  if (node.type === 'elevator_door') return '#FF9500';
  if (node.type === 'stair_landing') return '#9B59B6';
  if (node.type === 'doorway') return '#00BFFF';
  return '#0057FF';
};