import React, { useRef, useMemo } from 'react';
import { SafeAreaView, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import MapScreen from './screens/MapScreen';

export default function App() {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%'], []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <MapScreen />

        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
        >
          <BottomSheetView style={{ padding: 16 }}>
            <Text>Test Bottom Sheet</Text>
          </BottomSheetView>
        </BottomSheet>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
