import React, { useCallback, useState } from 'react';
import { View, StyleSheet,Text } from 'react-native';
import IndoorControls from '../components/indoor/IndoorControls';
import { BuildingShape } from '../types/BuildingShape';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { floorPlans } from '../utils/floorPlans';
type props = {
  onExitIndoor: () => void;
  onOpenCalendar?: () => void;
  building: BuildingShape;
};
export default function IndoorMapScreen({
  onExitIndoor,
  onOpenCalendar,
  building,
}: Readonly<props>) {
  const [currentFloor, setCurrentFloor] = useState(1);

  const handleFloorUp = useCallback(() => {
    setCurrentFloor((prev) => prev + 1);
  }, []);

  const handleFloorDown = useCallback(() => {
    setCurrentFloor((prev) => Math.max(1, prev - 1));
  }, []);

  const currentFloorPlan=floorPlans.CC[1]
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'white' }}>
      <IndoorControls
        onExitIndoor={onExitIndoor}
        onOpenCalendar={onOpenCalendar}
        onFloorUp={handleFloorUp}
        onFloorDown={handleFloorDown}
        currentFloor={currentFloor}
        building={building}
      />
      <ReactNativeZoomableView
        maxZoom={10}
        minZoom={1}
        zoomStep={0.5}
        initialZoom={1}
        bindToBorders={true}
      >
        <Text>{building.shortCode}</Text>
      </ReactNativeZoomableView>
    </View>
  );
}
