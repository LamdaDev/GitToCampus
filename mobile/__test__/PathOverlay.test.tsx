import React from 'react';
import { render } from '@testing-library/react-native';
import PathOverlay from '../src/components/indoor/PathOverlay';
import type { IndoorNode } from '../src/utils/indoor/indoorPathFinding';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mock = (name: string) => {
    const Component = ({ children, ...props }: any) => React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    default: mock('Svg'),
    Circle: mock('Circle'),
    Line: mock('Line'),
    G: mock('G'),
  };
});

const makeNode = (
  overrides: Partial<IndoorNode> & { id: string; x: number; y: number },
): IndoorNode => ({
  type: 'room',
  buildingId: 'test-building',
  floor: 1,
  label: '',
  accessible: true,
  ...overrides,
});

const simplePath: IndoorNode[] = [
  makeNode({ id: 'a', x: 0, y: 0 }),
  makeNode({ id: 'b', x: 100, y: 100 }),
];

describe('PathOverlay', () => {
  it('returns null when fewer than 2 nodes', () => {
    const { toJSON } = render(<PathOverlay pathNodes={[]} planType="svg" allNodes={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders lines and circles for a valid path', () => {
    const { UNSAFE_getAllByType } = render(
      <PathOverlay pathNodes={simplePath} planType="svg" allNodes={simplePath} />,
    );
    const { Line, Circle } = require('react-native-svg');
    expect(UNSAFE_getAllByType(Line)).toHaveLength(1);
    expect(UNSAFE_getAllByType(Circle)).toHaveLength(2);
  });

  it('uses size 1000 for png planType and 100% for svg', () => {
    const { UNSAFE_getByType, rerender } = render(
      <PathOverlay pathNodes={simplePath} planType="png" allNodes={simplePath} />,
    );
    const { default: Svg } = require('react-native-svg');
    expect(UNSAFE_getByType(Svg).props.width).toBe(1000);

    rerender(<PathOverlay pathNodes={simplePath} planType="svg" allNodes={simplePath} />);
    expect(UNSAFE_getByType(Svg).props.width).toBe('100%');
  });

  it('applies coordinate scaling when svgViewBox and nodeSpace are provided', () => {
    const { UNSAFE_getAllByType } = render(
      <PathOverlay
        pathNodes={simplePath}
        planType="svg"
        allNodes={simplePath}
        svgViewBox={{ width: 500, height: 250 }}
        nodeSpace={{ width: 1000, height: 500 }}
      />,
    );
    const { Line } = require('react-native-svg');
    const line = UNSAFE_getAllByType(Line)[0];
    expect(line.props.x2).toBe(50); // 100 * (500/1000)
    expect(line.props.y2).toBe(50); // 100 * (250/500)
  });
});
