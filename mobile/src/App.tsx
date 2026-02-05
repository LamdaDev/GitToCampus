import React,{useState} from 'react';
import { SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider from "./components/BottomSlider";
import MapScreen from './screens/MapScreen';
import { BuildingShape } from './types/BuildingShape';

/**
 * App.tsx is the entry point Expo looks for by default.
 * We keep it lightweight and delegate most UI logic to screens/components.
 *
 * SafeAreaView ensures content doesn't overlap with notches/status bars on iOS.
 * 
 * selectedBuildingName is a prop that will be passed down to MapScreen, the value gets updated upon tapping a building from the UI
 */
const App = () => {
  const [selectedBuilding,setSelectedBuilding]=useState<BuildingShape|null>(null);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <MapScreen passSelectedBuilding={setSelectedBuilding}/>
        <BottomSlider selectedBuilding={selectedBuilding} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
