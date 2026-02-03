import React, { useMemo, useRef, ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Divider } from 'react-native-paper';
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import { bottomSliderStyles } from '../styles/BottomSlider.styles';

export default function BottomSlider() {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['33%'], []);

    return (
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={bottomSliderStyles.sheetBackground}
          handleIndicatorStyle={bottomSliderStyles.handle}
        >
          <BottomSheetView style={bottomSliderStyles.container}>
            {/* Header */}
            <View style={bottomSliderStyles.header}>
              <View>
                <Text style={bottomSliderStyles.title}>Hall Building</Text>
                <Text style={bottomSliderStyles.subtitle}>
                  1400 De Maisonneuve Blvd. W.
                </Text>
              </View>

              <View style={bottomSliderStyles.headerIcons}>
                <TouchableOpacity style={bottomSliderStyles.iconButton}>
                  <Ionicons name="enter-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={bottomSliderStyles.iconButton}>
                  <Ionicons name="share-social-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={bottomSliderStyles.iconButton}>
                  <Ionicons name="close-sharp" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sections */}
            <Section title="Hotspots">
              <Divider style={{ backgroundColor: "#9B9B9B", height: 1, marginVertical: 8 }} />
              <Bullet text="Concordia Theatre" />
              <Bullet text="Reggies" />
              <Bullet text="Sir George Williams University Alumni Auditorium" />
            </Section>

            <Section title="Services">
              <Divider style={{ backgroundColor: "#9B9B9B", height: 1, marginVertical: 8 }} />
              <Bullet text="Campus Safety and Prevention Services" />
              <Bullet text="Concordia Student Union (CSU)" />
              <Bullet text="First Stop" />
              <Bullet text="IT Service Desk" />
              <Bullet text="Space Français" />
              <Bullet text="Nova Black Student Centre" />
              <Bullet text="Office of Student Life and Engagement" />
              <Bullet text="Student Success Centre" />
              <Bullet text="Welcome Crew Office" />
              <Bullet text="Zen Den" />
            </Section>
          </BottomSheetView>
        </BottomSheet>
    );
}

/* ---------- Types ---------- */

type SectionProps = {
  title: string;
  children: ReactNode;
};

type BulletProps = {
  text: string;
};

/* ---------- Reusable Components ---------- */

const Section = ({ title, children }: SectionProps) => {
  return (
    <View style={bottomSliderStyles.section}>
      <View style={bottomSliderStyles.sectionHeader}>
        <Text style={bottomSliderStyles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const Bullet = ({ text }: BulletProps) => {
  return (
    <View style={bottomSliderStyles.bulletRow}>
      <Text style={bottomSliderStyles.bullet}>•</Text>
      <Text style={bottomSliderStyles.bulletText}>{text}</Text>
    </View>
  );
};