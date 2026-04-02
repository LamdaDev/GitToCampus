import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SearchBar } from 'react-native-elements';
import { searchBuilding } from '../styles/SearchBuilding.styles';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { BuildingShape } from '../types/BuildingShape';
import type { ListRenderItemInfo } from 'react-native';
import { roomListStyles as inDoorList } from '../styles/RoomList.Styles';
import type { SearchMode } from '../types/SearchMode';
import {
  clearGoogleCalendarSession,
  connectGoogleCalendarAsync,
  fetchGoogleCalendarEventsAsync,
  getStoredGoogleCalendarSessionState,
  type GoogleCalendarEventItem,
  type GoogleCalendarConnectionStatus,
} from '../services/googleCalendarAuth';
import { getSupportedActiveOrUpcomingEvents } from '../utils/googleCalendarEventSelection';
import type { PoiCategory, PoiRangeKm } from '../types/Poi';
import type { RoomNode } from './indoor/RoomList';
import RoomList from './indoor/RoomList';

type SearchBarProps = {
  buildings: BuildingShape[];
  onPressBuilding?: (b: BuildingShape) => void;
  onCalendarConnected?: () => void;
  selectedCalendarIds?: string[];
  onCalendarGoPress?: (nextClassEvent: GoogleCalendarEventItem | null) => void;
  calendarGoErrorMessage?: string | null;
  searchMode?: SearchMode;
  onSelectRoom?: (room: RoomNode) => void;
  selectedPoiCategory?: PoiCategory | null;
  onPoiCategoryChange?: (category: PoiCategory | null) => void;
  selectedPoiRangeKm?: PoiRangeKm;
  onPoiRangeChange?: (rangeKm: PoiRangeKm) => void;
};

const SearchBarCompat = SearchBar as React.ComponentType<any>;
const SEARCH_LIST_INITIAL_NUM_TO_RENDER = 12;
const SEARCH_LIST_MAX_TO_RENDER_PER_BATCH = 12;
const SEARCH_LIST_WINDOW_SIZE = 7;

export default function SearchSheet({
  buildings,
  onPressBuilding,
  onCalendarConnected,
  selectedCalendarIds = [],
  onCalendarGoPress,
  calendarGoErrorMessage = null,
  searchMode = 'buildings',
  onSelectRoom,
  selectedPoiCategory = null,
  onPoiCategoryChange,
  selectedPoiRangeKm = 3,
  onPoiRangeChange,
}: Readonly<SearchBarProps>) {
  const [search, setSearch] = useState('');
  const [isPoiPanelOpen, setIsPoiPanelOpen] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<GoogleCalendarConnectionStatus>('loading');
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [isCalendarConnecting, setIsCalendarConnecting] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [nextClassEvent, setNextClassEvent] = useState<GoogleCalendarEventItem | null>(null);
  const [isNextClassLoading, setIsNextClassLoading] = useState(false);
  const [hasOnlyUnsupportedNextClassEvents, setHasOnlyUnsupportedNextClassEvents] = useState(false);
  const nextClassRequestIdRef = useRef(0);

  const nextClassLabel = useMemo(() => {
    if (isNextClassLoading) return 'Loading next class...';
    if (selectedCalendarIds.length === 0) return 'Select calendars to see your next class.';
    if (!nextClassEvent) {
      return hasOnlyUnsupportedNextClassEvents
        ? 'No upcoming classes with supported Concordia locations'
        : 'No upcoming or in-progress classes';
    }
    return nextClassEvent.location ?? 'Location not provided';
  }, [
    hasOnlyUnsupportedNextClassEvents,
    isNextClassLoading,
    nextClassEvent,
    selectedCalendarIds.length,
  ]);

  const loadNextClass = useCallback(async () => {
    const requestId = nextClassRequestIdRef.current + 1;
    nextClassRequestIdRef.current = requestId;

    if (calendarStatus !== 'connected') {
      setIsNextClassLoading(false);
      setNextClassEvent(null);
      setHasOnlyUnsupportedNextClassEvents(false);
      return;
    }

    if (selectedCalendarIds.length === 0) {
      setIsNextClassLoading(false);
      setNextClassEvent(null);
      setHasOnlyUnsupportedNextClassEvents(false);
      return;
    }

    setIsNextClassLoading(true);
    const result = await fetchGoogleCalendarEventsAsync(selectedCalendarIds);
    if (nextClassRequestIdRef.current !== requestId) return;

    setIsNextClassLoading(false);

    if (result.type === 'error') {
      setNextClassEvent(null);
      setHasOnlyUnsupportedNextClassEvents(false);
      return;
    }

    const { hasOnlyUnsupportedActiveOrUpcomingEvents, supportedActiveOrUpcomingEvents } =
      getSupportedActiveOrUpcomingEvents({
        events: result.events,
        nowTimestamp: Date.now(),
      });

    setHasOnlyUnsupportedNextClassEvents(hasOnlyUnsupportedActiveOrUpcomingEvents);
    setNextClassEvent(supportedActiveOrUpcomingEvents[0] ?? null);
  }, [calendarStatus, selectedCalendarIds]);

  const searchableBuildings = useMemo(
    () =>
      buildings.map((building) => ({
        building,
        normalizedSearchText: `${building.name} ${building.address ?? ''}`.toLowerCase(),
      })),
    [buildings],
  );

  const filtered = useMemo(() => {
    const searchCriteria = search.trim().toLowerCase();
    if (!searchCriteria) return buildings;
    return searchableBuildings
      .filter(({ normalizedSearchText }) => normalizedSearchText.includes(searchCriteria))
      .map(({ building }) => building);
  }, [buildings, search, searchableBuildings]);

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

  useEffect(
    () => () => {
      nextClassRequestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    void loadNextClass();
  }, [loadNextClass]);

  const handleConnectCalendar = useCallback(async () => {
    setIsCalendarConnecting(true);
    setCalendarMessage(null);

    const result = await connectGoogleCalendarAsync();
    setIsCalendarConnecting(false);

    if (result.type === 'success') {
      setCalendarStatus('connected');
      setSessionExpiresAt(result.session.expiresAt);
      setCalendarMessage(null);
      onCalendarConnected?.();
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
  }, [onCalendarConnected]);

  const handleDisconnectCalendar = useCallback(async () => {
    try {
      await clearGoogleCalendarSession();
    } catch {
      // Force local sign-out UI state even if secure-store cleanup fails.
    }

    setCalendarStatus('not_connected');
    setSessionExpiresAt(null);
    setNextClassEvent(null);
    setHasOnlyUnsupportedNextClassEvents(false);
    setCalendarMessage('Signed out of Google Calendar.');
  }, []);

  const buttonText = useMemo(() => {
    if (isCalendarConnecting) return 'Connecting...';
    if (calendarStatus === 'connected') return 'Sign Out Google Calendar';
    if (calendarStatus === 'loading') return 'Preparing Google Sign-In';
    if (calendarStatus === 'expired') {
      return 'Reconnect Google Calendar';
    }
    return 'Connect Google Calendar';
  }, [calendarStatus, isCalendarConnecting]);

  const buttonDisabled = isCalendarConnecting || calendarStatus === 'loading';
  const handleSearchChange = useCallback((text?: string) => {
    setSearch(text ?? '');
  }, []);
  const showsRooms = searchMode === 'rooms' || searchMode === 'mixed';
  const showsBuildings = searchMode === 'buildings' || searchMode === 'mixed';

  const renderBuildingItem = useCallback(
    ({ item }: ListRenderItemInfo<BuildingShape>) => (
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
            {item.shortCode ? `(${item.shortCode}) ` : ''}
            {item.address}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [onPressBuilding],
  );

  const renderedBuildingResults = useMemo(
    () =>
      filtered.length > 0 ? (
        filtered.map((building) => (
          <View key={building.id}>
            {renderBuildingItem({ item: building } as ListRenderItemInfo<BuildingShape>)}
          </View>
        ))
      ) : (
        <Text style={searchBuilding.emptyText}>No buildings found</Text>
      ),
    [filtered, renderBuildingItem],
  );

  const renderedSearchResults = useMemo(() => {
    if (showsRooms && showsBuildings) {
      return (
        <BottomSheetScrollView
          testID="mixed-search-results"
          style={searchBuilding.scrollArea}
          contentContainerStyle={searchBuilding.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text testID="search-section-rooms" style={searchBuilding.sectionTitle}>
            Rooms
          </Text>
          <View style={searchBuilding.mixedSectionContainer}>
            <RoomList search={search} onSelectRoom={onSelectRoom} variant="static" />
          </View>

          <Text testID="search-section-buildings" style={searchBuilding.sectionTitle}>
            Buildings
          </Text>
          <View style={searchBuilding.mixedSectionContainer}>{renderedBuildingResults}</View>
        </BottomSheetScrollView>
      );
    }

    if (showsRooms) {
      return (
        <BottomSheetScrollView
          testID="rooms-search-results"
          style={searchBuilding.scrollArea}
          contentContainerStyle={searchBuilding.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <RoomList search={search} onSelectRoom={onSelectRoom} variant="static" />
        </BottomSheetScrollView>
      );
    }

    return (
      <BottomSheetFlatList<BuildingShape>
        data={filtered}
        keyExtractor={(item: BuildingShape) => item.id}
        contentContainerStyle={searchBuilding.listContent}
        showsVerticalScrollIndicator={true}
        initialNumToRender={SEARCH_LIST_INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={SEARCH_LIST_MAX_TO_RENDER_PER_BATCH}
        windowSize={SEARCH_LIST_WINDOW_SIZE}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={searchBuilding.emptyText}>No buildings found</Text>}
        renderItem={renderBuildingItem}
      />
    );
  }, [
    filtered,
    onSelectRoom,
    renderedBuildingResults,
    renderBuildingItem,
    search,
    showsBuildings,
    showsRooms,
  ]);

  return (
    <View style={searchBuilding.screen}>
      <View style={searchBuilding.searchBarRow}>
        <SearchBarCompat
          placeholder="Get to..."
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
        <TouchableOpacity
          testID="search-poi-options-toggle"
          accessibilityRole="button"
          accessibilityLabel="Open POI options"
          style={searchBuilding.searchOptionsButton}
          activeOpacity={0.85}
          onPress={() => setIsPoiPanelOpen((previous) => !previous)}
        >
          <Ionicons name="options-outline" size={24} color="#fff4f6" />
        </TouchableOpacity>
      </View>

      {isPoiPanelOpen ? (
        <View style={searchBuilding.poiControlsPanel} testID="search-poi-panel">
          <View style={searchBuilding.poiCategoryColumn}>
            {(['cafe', 'restaurant'] as PoiCategory[]).map((category) => {
              const isSelected = selectedPoiCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  testID={`search-poi-chip-${category}`}
                  style={[
                    searchBuilding.poiCategoryCheckboxRow,
                    isSelected && searchBuilding.poiCategoryCheckboxRowSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onPoiCategoryChange?.(isSelected ? null : category)}
                >
                  <Text style={searchBuilding.poiCategoryCheckboxLabel}>
                    {category === 'cafe' ? 'Cafes' : 'Restaurants'}
                  </Text>
                  <View
                    style={[
                      searchBuilding.poiCategoryCheckbox,
                      isSelected && searchBuilding.poiCategoryCheckboxSelected,
                    ]}
                  >
                    {isSelected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedPoiCategory ? (
            <View style={searchBuilding.poiRangeRow}>
              <Text style={searchBuilding.poiRangeLabel}>Point of Interest Range (km):</Text>
              <View style={searchBuilding.poiRangeControl}>
                <View style={searchBuilding.poiRangeValueBox}>
                  <Text style={searchBuilding.poiRangeValueText}>{selectedPoiRangeKm}</Text>
                </View>
                <View style={searchBuilding.poiRangeStepper}>
                  <TouchableOpacity
                    testID="search-poi-range-increase"
                    style={searchBuilding.poiRangeStepperButton}
                    activeOpacity={0.8}
                    onPress={() =>
                      onPoiRangeChange?.(Math.min(3, selectedPoiRangeKm + 1) as PoiRangeKm)
                    }
                  >
                    <Ionicons name="chevron-up" size={22} color="#fff4f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="search-poi-range-decrease"
                    style={searchBuilding.poiRangeStepperButton}
                    activeOpacity={0.8}
                    onPress={() =>
                      onPoiRangeChange?.(Math.max(1, selectedPoiRangeKm - 1) as PoiRangeKm)
                    }
                  >
                    <Ionicons name="chevron-down" size={22} color="#fff4f6" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {calendarStatus === 'connected' ? (
        <View style={searchBuilding.nextClassCard} testID="next-class-card">
          <View style={searchBuilding.nextClassTextWrap}>
            <Text style={searchBuilding.nextClassTitle} numberOfLines={2} ellipsizeMode="tail">
              {nextClassEvent?.title ?? 'Next Class'}
            </Text>
            <Text style={searchBuilding.nextClassMeta} numberOfLines={1}>
              {nextClassLabel}
            </Text>
          </View>
          <TouchableOpacity
            testID="next-class-go-button"
            accessibilityRole="button"
            style={searchBuilding.nextClassGoButton}
            disabled={isNextClassLoading}
            onPress={() => onCalendarGoPress?.(nextClassEvent)}
          >
            <Text style={searchBuilding.nextClassGoText}>GO</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {calendarStatus === 'connected' && calendarGoErrorMessage ? (
        <Text testID="calendar-go-error-message" style={searchBuilding.authMessage}>
          {calendarGoErrorMessage}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[searchBuilding.signIn, buttonDisabled && searchBuilding.signInDisabled]}
        disabled={buttonDisabled}
        onPress={() =>
          void (calendarStatus === 'connected'
            ? handleDisconnectCalendar()
            : handleConnectCalendar())
        }
        testID="connect-google-calendar-button"
      >
        <Ionicons name="logo-google" size={18} color="#111" />
        <Text style={searchBuilding.signInText}>{buttonText}</Text>
      </TouchableOpacity>
      {calendarMessage ? <Text style={searchBuilding.authMessage}>{calendarMessage}</Text> : null}

      <View
        style={[
          showsRooms && !showsBuildings
            ? inDoorList.indoorContainer
            : searchBuilding.buildingsContainer,
        ]}
      >
        {renderedSearchResults}
      </View>
    </View>
  );
}
