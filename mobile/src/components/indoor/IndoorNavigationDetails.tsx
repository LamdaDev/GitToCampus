import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { directionDetailsStyles } from '../../styles/DirectionDetails.styles';
import { isMultiFloor } from '../../utils/indoor/isMultifloor';

type PathStep = { icon: string; label: string };

type IndoorNavigationProps = {
  startRoom: string | null;
  destinationRoom: string | null;
  buildingName?: string;
  pathSteps: PathStep[];
  onBack: () => void;
  onClose: () => void;
  onPrevFloor?: () => void;
  onNextFloor?: () => void;
};

export default function IndoorNavigationDetails({
  startRoom,
  destinationRoom,
  buildingName,
  pathSteps,
  onBack,
  onClose,
  onPrevFloor,
  onNextFloor,
}: Readonly<IndoorNavigationProps>) {


  return (
    <ScrollView
      style={directionDetailsStyles.contentScroll}
      contentContainerStyle={directionDetailsStyles.contentScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={directionDetailsStyles.header}>
        <View style={directionDetailsStyles.transitHeaderTextWrap}>
          <Text
            style={[
              directionDetailsStyles.directionTitle,
              directionDetailsStyles.transitHeaderTitleText,
            ]}
          >
            {startRoom ?? '?'} → {destinationRoom ?? '?'}
          </Text>
          {buildingName ? (
            <Text style={directionDetailsStyles.transitDestinationText}>{buildingName}</Text>
          ) : null}
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          <TouchableOpacity style={directionDetailsStyles.iconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={directionDetailsStyles.iconButton} onPress={onClose}>
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* FLOOR NAV */}
      {isMultiFloor(pathSteps) ? (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(146,35,56,0.9)',
              borderRadius: 12,
              padding: 10,
              alignItems: 'center',
            }}
            onPress={onPrevFloor}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Prev Floor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(146,35,56,0.9)',
              borderRadius: 12,
              padding: 10,
              alignItems: 'center',
            }}
            onPress={onNextFloor}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Next Floor</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* PATH STEPS */}
      <View style={directionDetailsStyles.transitContainer}>
        {pathSteps.length === 0 ? (
          <Text style={directionDetailsStyles.transitEmptyText}>
            No path found between these rooms.
          </Text>
        ) : (
          pathSteps.map((step, index) => (
            <View
              key={step.label}
              style={[
                directionDetailsStyles.transitStepRow,
                index > 0 && directionDetailsStyles.transitStepRowWithDivider,
              ]}
            >
              <View style={directionDetailsStyles.transitIconBadge}>
                <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              </View>
              <View style={directionDetailsStyles.transitStepBody}>
                <Text style={directionDetailsStyles.transitStepTitle}>{step.label}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
