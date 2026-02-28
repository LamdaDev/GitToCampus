import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SearchBar } from 'react-native-elements';
import { searchBuilding } from '../styles/SearchBuilding.styles';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { BuildingShape } from '../types/BuildingShape';
import {
  clearGoogleCalendarSession,
  connectGoogleCalendarAsync,
  getStoredGoogleCalendarSessionState,
  type GoogleCalendarConnectionStatus,
} from '../services/googleCalendarAuth';

type SearchBarProps = {
  buildings: BuildingShape[];
  onPressBuilding?: (b: BuildingShape) => void;
};

const SearchBarCompat = SearchBar as React.ComponentType<any>;

export default function SearchSheet({ buildings, onPressBuilding }: Readonly<SearchBarProps>) {
  const [search, setSearch] = useState('');
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarConnectionStatus>('loading');
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [isCalendarConnecting, setIsCalendarConnecting] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const searchCriteria = search.trim().toLowerCase();
    if (!searchCriteria) return buildings;
    return buildings.filter((building) =>
      (building.name + ' ' + building.address).toLowerCase().includes(searchCriteria),
    );
  }, [search, buildings]);

  const markSessionExpired = useCallback(async () => {
    try {
      await clearGoogleCalendarSession();
    } catch {
      // Even if secure storage cleanup fails, force reconnect state in UI.
    }
    setCalendarStatus('expired');
    setSessionExpiresAt(null);
    setCalendarMessage('Session expired. Reconnect Google Calendar to continue syncing.');
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const state = await getStoredGoogleCalendarSessionState();
      if (!isMounted) return;

      setCalendarStatus(state.status);
      setSessionExpiresAt(state.session?.expiresAt ?? null);
      if (state.status === 'expired') {
        setCalendarMessage('Session expired. Reconnect Google Calendar to continue syncing.');
      }
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (calendarStatus !== 'connected') return;
    if (!sessionExpiresAt) return;

    const millisRemaining = sessionExpiresAt - Date.now();
    if (millisRemaining <= 0) {
      void markSessionExpired();
      return;
    }

    const timeoutId = setTimeout(() => {
      void markSessionExpired();
    }, millisRemaining + 10);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [calendarStatus, markSessionExpired, sessionExpiresAt]);

  const handleConnectCalendar = useCallback(async () => {
    setIsCalendarConnecting(true);
    setCalendarMessage(null);

    const result = await connectGoogleCalendarAsync();
    setIsCalendarConnecting(false);

    if (result.type === 'success') {
      setCalendarStatus('connected');
      setSessionExpiresAt(result.session.expiresAt);
      setCalendarMessage('Google Calendar connected.');
      return;
    }

    if (result.type === 'cancel') {
      setCalendarMessage('Google sign-in was canceled. You can continue using the app.');
      setCalendarStatus((previousStatus) =>
        previousStatus === 'connected' || previousStatus === 'expired'
          ? previousStatus
          : 'not_connected',
      );
      return;
    }

    if (result.type === 'denied') {
      setCalendarMessage(
        'Calendar permission was denied. You can continue using the app and connect later.',
      );
      setCalendarStatus((previousStatus) =>
        previousStatus === 'connected' || previousStatus === 'expired'
          ? previousStatus
          : 'not_connected',
      );
      return;
    }

    setCalendarMessage(result.message);
    setCalendarStatus((previousStatus) =>
      previousStatus === 'connected' || previousStatus === 'expired'
        ? previousStatus
        : 'not_connected',
    );
  }, []);

  const helperText = useMemo(() => {
    if (calendarStatus === 'connected') return 'Google Calendar sync is enabled.';
    if (calendarStatus === 'expired') return 'Google Calendar session expired.';
    return 'Sign in below to sync your calendar';
  }, [calendarStatus]);

  const statusLabel = useMemo(() => {
    if (calendarStatus === 'connected') return 'Connected';
    if (calendarStatus === 'expired') return 'Session expired';
    if (calendarStatus === 'loading') return 'Checking...';
    return 'Not connected';
  }, [calendarStatus]);

  const buttonText = useMemo(() => {
    if (isCalendarConnecting) return 'Connecting...';
    if (calendarStatus === 'loading') return 'Preparing Google Sign-In';
    if (calendarStatus === 'connected' || calendarStatus === 'expired') {
      return 'Reconnect Google Calendar';
    }
    return 'Connect Google Calendar';
  }, [calendarStatus, isCalendarConnecting]);

  const buttonDisabled = isCalendarConnecting || calendarStatus === 'loading';
  const handleSearchChange = useCallback((text?: string) => {
    setSearch(text ?? '');
  }, []);

  return (
    <View style={searchBuilding.screen}>
      <SearchBarCompat
        placeholder="Search buildings..."
        onChangeText={handleSearchChange}
        value={search}
        platform="default"
        containerStyle={searchBuilding.searchOuter}
        inputContainerStyle={searchBuilding.searchInner}
        inputStyle={searchBuilding.searchText}
        placeholderTextColor={'#ffffffc9'}
        leftIconContainerStyle={{ opacity: 0.9, paddingLeft: 2 }}
        searchIcon={{ name: 'search', type: 'ionicon', size: 25, color: '#d7c9cf' }}
      />

      <Text style={searchBuilding.helperText}>{helperText}</Text>
      <Text
        testID="calendar-connection-status"
        style={[
          searchBuilding.connectionStatus,
          calendarStatus === 'connected' && searchBuilding.connectionStatusConnected,
          calendarStatus === 'expired' && searchBuilding.connectionStatusExpired,
        ]}
      >
        Calendar status: {statusLabel}
      </Text>

      <TouchableOpacity
        style={[searchBuilding.signIn, buttonDisabled && searchBuilding.signInDisabled]}
        disabled={buttonDisabled}
        onPress={() => void handleConnectCalendar()}
        testID="connect-google-calendar-button"
      >
        <Ionicons name="logo-google" size={18} color="#111" />
        <Text style={searchBuilding.signInText}>{buttonText}</Text>
      </TouchableOpacity>
      {calendarMessage ? <Text style={searchBuilding.authMessage}>{calendarMessage}</Text> : null}

      <View style={[searchBuilding.buildingsContainer, { maxHeight: 400 }]}>
        <BottomSheetFlatList<BuildingShape>
          data={filtered}
          keyExtractor={(item: BuildingShape) => item.id}
          contentContainerStyle={searchBuilding.listContent}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={<Text style={searchBuilding.emptyText}>No buildings found</Text>}
          renderItem={({ item }: { item: BuildingShape }) => (
            <TouchableOpacity
              style={searchBuilding.buildingPill}
              activeOpacity={0.85}
              onPress={() => onPressBuilding?.(item)}
            >
              <View style={searchBuilding.iconWrap}>
                <Ionicons name="location-outline" size={34} color="#F5F1F2" />
              </View>

              <View style={searchBuilding.textWrap}>
                <Text style={searchBuilding.buildingName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={searchBuilding.buildingAddress} numberOfLines={1}>
                  {'(' + item.shortCode + ') '}
                  {item.address}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}
