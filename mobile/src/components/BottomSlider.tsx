/**BottomSlider.tsx is a template to allow other components such as BuildingDetails.tsx 
 * to slot inside information into the BottomSheet**/

import React, { useMemo, useRef, ReactNode,useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Divider } from 'react-native-paper';
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { bottomSliderStyles } from '../styles/BottomSlider.styles';
import BuildingDetails from './BuildingDetails'
import { BuildingShape } from "../types/BuildingShape";

type BottomSliderProps={
  selectedBuilding:BuildingShape|null;
}


export default function BottomSlider({selectedBuilding}:BottomSliderProps) {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = ['33%','66%'];
    const [isOpen,setIsOpen]= useState(true);
    return (
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={bottomSliderStyles.sheetBackground}
          handleIndicatorStyle={bottomSliderStyles.handle}
          enablePanDownToClose={true}
          onClose={()=>setIsOpen(false)}
        >
          <BottomSheetView style={bottomSliderStyles.container}>
            {/** Renders the building details*/}
            
            <BuildingDetails selectedBuilding={selectedBuilding}/>
            {/** todo: Add in GoogleCalendar Bottom Sheet here and add logic to only render one bottom sheet type at a time*/}
          </BottomSheetView>
        </BottomSheet>
    );
}
