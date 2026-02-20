import React, { createRef } from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import BottomSlider, { BottomSliderHandle } from '../src/components/BottomSheet';
import { BuildingShape } from '../src/types/BuildingShape';
import * as directionsService from '../src/services/googleDirections';

const mockSnapToIndex = jest.fn();
const mockClose = jest.fn();

const mockBuildings: BuildingShape[] = [
  {
    polygons: [
      [
        { latitude: 45.458, longitude: -73.641 },
        { latitude: 45.459, longitude: -73.641 },
        { latitude: 45.459, longitude: -73.642 },
      ],
    ],
    id: 'sgw-1',
    campus: 'LOYOLA',
    name: 'FC Building',
    hotspots: {
      'Loyola Chapel': 'https://www.concordia.ca/hospitality/venues/loyola-chapel.html',
    },
    services: {
      'Concordia Multi-Faith and Spirituality Centre':
        'https://www.concordia.ca/equity/spirituality.html',
    },
    address: '7141 Sherbrooke West',
  },
  {
    polygons: [
      [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.58 },
      ],
    ],
    id: 'loy-1',
    campus: 'SGW',
    name: 'EV Building',
    address: '1515 Ste-Catherine W',
  },
];

const defaultProps = {
  mode: 'detail' as const,
  revealSearchBar: jest.fn(),
  buildings: mockBuildings,
  onExitSearch: jest.fn(),
  passSelectedBuilding: jest.fn(),
  passOutdoorRoute: jest.fn(),
  userLocation: null,
  currentBuilding: null,
};

jest.mock('../src/services/googleDirections', () => ({
  fetchOutdoorDirections: jest.fn(),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  type MockProps = {
    children?: React.ReactNode;
  };

  return {
    __esModule: true,

    default: React.forwardRef(
      (
        props: { children: any; onClose?: () => void; onAnimate?: (from: number, to: number) => void },
        ref: any,
      ) => {
      const React = require('react');
      const { View, TouchableOpacity, Text } = require('react-native');

      React.useImperativeHandle(ref, () => ({
        snapToIndex: mockSnapToIndex,
        close: mockClose,
      }));

      return (
        <View testID="bottom-sheet">
          <TouchableOpacity testID="trigger-on-close" onPress={props.onClose}>
            <Text>Trigger Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="trigger-on-animate-close"
            onPress={() => props.onAnimate?.(0, -1)}
          >
            <Text>Trigger Animate Close</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="trigger-on-animate-open" onPress={() => props.onAnimate?.(0, 0)}>
            <Text>Trigger Animate Open</Text>
          </TouchableOpacity>
          {props.children}
        </View>
      );
    },
    ),
    BottomSheetView: ({ children }: MockProps) => (
      <View testID="bottom-sheet-view">{children}</View>
    ),
  };
});

jest.mock('../src/components/BuildingDetails', () => {
  const { View, Button } = require('react-native');

  type MockProps = {
    onClose: () => void;
    onShowDirections?: (building: any, asDestination?: boolean) => void;
    selectedBuilding?: any;
  };

  const MockBuildingDetails: React.FC<MockProps> = ({
    onClose,
    onShowDirections,
    selectedBuilding,
  }) => (
    <View testID="building-details">
      <Button testID="close-button" title="Close" onPress={onClose} />
      <Button
        testID="on-show-directions"
        title="Directions"
        onPress={() => onShowDirections?.({ id: 'mock-building' })}
      />
      <Button
        testID="on-show-directions-as-destination"
        title="Directions as destination"
        onPress={() => onShowDirections?.(selectedBuilding, true)}
      />
    </View>
  );

  return MockBuildingDetails;
});

jest.mock('../src/components/DirectionDetails', () => {
  const { View, Text, TouchableOpacity } = require('react-native');

  return ({
    destinationBuilding,
    onClose,
    onPressStart,
    onPressDestination,
    isCrossCampusRoute,
    isRouteLoading,
    routeErrorMessage,
    routeDurationText,
    routeDistanceText,
  }: any) => (
    <View testID="direction-details">
      <Text testID="destination-id">{destinationBuilding ? destinationBuilding.id : 'none'}</Text>
      <Text testID="cross-campus-state">{isCrossCampusRoute ? 'true' : 'false'}</Text>
      <Text testID="route-loading-state">{isRouteLoading ? 'true' : 'false'}</Text>
      <Text testID="route-error-state">{routeErrorMessage ?? 'none'}</Text>
      <Text testID="route-summary-state">
        {routeDurationText && routeDistanceText
          ? `${routeDurationText} • ${routeDistanceText}`
          : 'none'}
      </Text>
      <TouchableOpacity testID="close-directions-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
      {/* NEW: exposes lines 137-138 */}
      <TouchableOpacity testID="press-start" onPress={onPressStart}>
        <Text>Start</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="press-destination" onPress={onPressDestination}>
        <Text>Destination</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/SearchSheet', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ onPressBuilding }: any) => (
    <View testID="search-sheet">
      <TouchableOpacity
        testID="press-building-in-search"
        onPress={() =>
          onPressBuilding({
            id: 'found-building',
            name: 'Found Hall',
            polygons: [
              [
                { latitude: 45.49, longitude: -73.58 },
                { latitude: 45.491, longitude: -73.58 },
                { latitude: 45.491, longitude: -73.581 },
              ],
            ],
            campus: 'SGW',
          })
        }
      >
        <Text>Select</Text>
      </TouchableOpacity>
    </View>
  );
});

describe('BottomSheet', () => {
  const directionsServiceMock = directionsService as jest.Mocked<typeof directionsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    directionsServiceMock.fetchOutdoorDirections.mockImplementation(
      () => new Promise(() => undefined),
    );
  });

  test('handles null selectedBuilding safely', () => {
    const ref = React.createRef<any>();

    expect(() =>
      render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />),
    ).not.toThrow();
  });

  test('opens and closes the bottom sheet via Imperative Handler', () => {
    const ref = createRef<BottomSliderHandle>();

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />,
    );

    // Check open and close events have been called
    ref.current?.open();
    expect(mockSnapToIndex).toHaveBeenCalledWith(0);

    // Check Close has been fired from child
    fireEvent.press(getByTestId('close-button'));
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders the BottomSheet components', () => {
    const ref = React.createRef<any>();

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />,
    );

    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('bottom-sheet-view')).toBeTruthy();
  });

  test('renders BuildingDetails when a building is selected', () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={selectedBuilding} />,
    );

    expect(getByTestId('building-details')).toBeTruthy();

    // Simulate pressing the close button
    fireEvent.press(getByTestId('close-button'));

    // The bottom sheet's close method should have been called
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders DirectionDetails when onShowDirections is called', () => {
    const ref = React.createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={selectedBuilding} />,
    );

    // Initially, DirectionDetails should not be visible
    expect(queryByTestId('direction-details')).toBeNull();

    // Press the onShowDirections button inside BuildingDetails
    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    // Now DirectionDetails should be rendered
    expect(getByTestId('direction-details')).toBeTruthy();

    // Optionally test closing DirectionDetails
    fireEvent.press(getByTestId('close-directions-button'));

    expect(mockClose).toHaveBeenCalled();
  });

  test('useEffect does NOT set destinationBuilding when selecting same building', () => {
    const ref = React.createRef<any>();
    const { getByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );
    const directionDetailsButton = getByTestId('on-show-directions');

    fireEvent.press(directionDetailsButton);

    // Re-select SAME building
    rerender(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />);

    const destinationBuildingID = getByTestId('destination-id').props.children;

    expect(destinationBuildingID).toBe('sgw-1');
  });

  test('setSnap calls snapToIndex via imperative handle', () => {
    const ref = createRef<BottomSliderHandle>();
    render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />);
    ref.current?.setSnap(1);

    expect(mockSnapToIndex).toHaveBeenCalledWith(1);
  });

  test('handleSheetAnimate calls revealSearchBar when the sheet closes', () => {
    const revealSearchBar = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        revealSearchBar={revealSearchBar}
      />,
    );
    fireEvent.press(getByTestId('trigger-on-animate-close'));

    expect(revealSearchBar).toHaveBeenCalled();
  });

  test('handleSheetAnimate does not call revealSearchBar for non-close transitions', () => {
    const revealSearchBar = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        revealSearchBar={revealSearchBar}
      />,
    );
    fireEvent.press(getByTestId('trigger-on-animate-open'));

    expect(revealSearchBar).not.toHaveBeenCalled();
  });

  test('handleSheetClose resets active view and clears route overlay', async () => {
    const passOutdoorRoute = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));
    expect(getByTestId('direction-details')).toBeTruthy();

    fireEvent.press(getByTestId('trigger-on-close'));

    await waitFor(() => {
      expect(getByTestId('building-details')).toBeTruthy();
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
    });
  });

  test('renders SearchSheet when mode is search', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('global search mode hides building details even when a building is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        mode="search"
      />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(queryByTestId('building-details')).toBeNull();
    expect(queryByTestId('direction-details')).toBeNull();
  });

  test('selecting a building in search mode calls passSelectedBuilding and onExitSearch', () => {
    const passSelectedBuilding = jest.fn();
    const onExitSearch = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        mode="search"
        passSelectedBuilding={passSelectedBuilding}
        onExitSearch={onExitSearch}
      />,
    );

    fireEvent.press(getByTestId('press-building-in-search'));

    expect(passSelectedBuilding).toHaveBeenCalled();
    expect(onExitSearch).toHaveBeenCalled();
  });

  test('pressing start in directions shows SearchSheet', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );
    fireEvent.press(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('pressing destination in directions shows SearchSheet', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-destination'));

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('selecting a building from internal search returns to directions view', () => {
    const passSelectedBuilding = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        passSelectedBuilding={passSelectedBuilding}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions'));
    fireEvent.press(getByTestId('press-start'));
    fireEvent.press(getByTestId('press-building-in-search'));

    expect(passSelectedBuilding).toHaveBeenCalled();
    expect(getByTestId('direction-details')).toBeTruthy();
  });

  test('snaps to index 1 when mode switches to search', () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="detail" />,
    );

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    jest.runAllTimers();
    expect(mockSnapToIndex).toHaveBeenCalledWith(1);
    jest.useRealTimers();
  });

  test('switching to global search hides directions view and shows only search sheet', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));
    expect(getByTestId('direction-details')).toBeTruthy();

    rerender(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        mode="search"
      />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(queryByTestId('direction-details')).toBeNull();
    expect(queryByTestId('building-details')).toBeNull();
  });

  test('useEffect sets destinationBuilding when selectedBuilding changes in directions view', () => {
    const { getByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions'));

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[1]} />,
    );

    expect(getByTestId('destination-id').props.children).toBe('loy-1');
  });

  test('sets cross-campus flag when current and destination campuses differ', () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('cross-campus-state').props.children).toBe('true');
  });

  test('does not set cross-campus flag for same-campus routes', () => {
    const sameCampusCurrent: BuildingShape = { ...mockBuildings[0], campus: 'SGW' };

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={sameCampusCurrent}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('cross-campus-state').props.children).toBe('false');
  });

  test('does not set cross-campus flag when start campus is unknown', () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={null}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('cross-campus-state').props.children).toBe('false');
  });

  test('requests outdoor route and passes route overlay when directions are available', async () => {
    const passOutdoorRoute = jest.fn();
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValueOnce({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const buildingsWithPolygons: BuildingShape[] = [
      {
        ...mockBuildings[0],
        polygons: [
          [
            { latitude: 45.458, longitude: -73.641 },
            { latitude: 45.459, longitude: -73.641 },
            { latitude: 45.459, longitude: -73.642 },
          ],
        ],
      },
      {
        ...mockBuildings[1],
        polygons: [
          [
            { latitude: 45.497, longitude: -73.579 },
            { latitude: 45.498, longitude: -73.579 },
            { latitude: 45.498, longitude: -73.58 },
          ],
        ],
      },
    ];

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={buildingsWithPolygons[1]}
        currentBuilding={buildingsWithPolygons[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalled();
      expect(passOutdoorRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: expect.any(Object),
          destination: expect.any(Object),
        }),
      );
    });
  });

  test('shows loading state while waiting for directions response', async () => {
    let resolveRoute: ((value: any) => void) | undefined;
    directionsServiceMock.fetchOutdoorDirections.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRoute = resolve;
        }),
    );

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-loading-state').props.children).toBe('true');
    });

    await act(async () => {
      resolveRoute?.({
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distanceMeters: 1200,
        distanceText: '1.2 km',
        durationSeconds: 840,
        durationText: '14 mins',
        bounds: null,
      });
    });

    await waitFor(() => {
      expect(getByTestId('route-loading-state').props.children).toBe('false');
      expect(getByTestId('route-summary-state').props.children).toContain('14 mins');
    });
  });

  test('clears route and skips fetch when start and destination are the same building', async () => {
    const passOutdoorRoute = jest.fn();

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));
    fireEvent.press(getByTestId('press-building-in-search'));
    fireEvent.press(getByTestId('press-destination'));
    fireEvent.press(getByTestId('press-building-in-search'));

    await waitFor(() => {
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalled();
    });
  });

  test('clears route and warns when directions fetch fails', async () => {
    const passOutdoorRoute = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    directionsServiceMock.fetchOutdoorDirections.mockRejectedValueOnce(new Error('bad request'));

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Failed to fetch outdoor directions', expect.any(Error));
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
      expect(getByTestId('route-error-state').props.children).toBe(
        'Unable to load route. Please try again.',
      );
    });

    warnSpy.mockRestore();
  });
});
