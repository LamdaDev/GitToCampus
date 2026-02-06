/**BottomSlider.tsx is a template to allow other components such as BuildingDetails.tsx 
 * to slot inside information into the BottomSheet**/

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";

import { buildingDetailsStyles } from "../styles/BuildingDetails.styles";
import BuildingDetails from "./BuildingDetails";
import type { BuildingShape } from "../types/BuildingShape";

export type BottomSliderHandle = {
  open: () => void;
  close: () => void;
};

type BottomSheetProps = {
  selectedBuilding: BuildingShape | null;
};

const BottomSlider = forwardRef<BottomSliderHandle, BottomSheetProps>(
  ({ selectedBuilding }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = ["33%", "66%"];

    const closeSheet = () => sheetRef.current?.close();
    const openSheet = () => sheetRef.current?.snapToIndex(0); // 33% (use 1 for 66%)


    useImperativeHandle(ref, () => ({
      open: openSheet,
      close: closeSheet,
    }));

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        backgroundStyle={buildingDetailsStyles.sheetBackground}
        handleIndicatorStyle={buildingDetailsStyles.handle}
        enablePanDownToClose={true}
      >
        <BottomSheetView style={buildingDetailsStyles.container}>
          <BuildingDetails selectedBuilding={selectedBuilding} onClose={closeSheet} />
        </BottomSheetView>
        {/**TO DO: Add in GoogleCalendar Bottom sheet view */}
      </BottomSheet>
    );
  }
);

export default BottomSlider;
