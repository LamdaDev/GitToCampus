import React from 'react';
import { View } from 'react-native';

const MockMapView = (props: any) => React.createElement(View, props);
const MockPolygon = (props: any) => React.createElement(View, props);
const MockMarker = (props: any) => React.createElement(View, props);
const MockPolyline = (props: any) => React.createElement(View, props);

export default MockMapView;
export const Polygon = MockPolygon;
export const Marker = MockMarker;
export const Polyline = MockPolyline;
export const PROVIDER_GOOGLE = 'google';
