import React from 'react';
import { render } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import App from '../src/App';

jest.mock('../src/screens/MapScreen', () => () => null);

describe('App', () => {
  test('renders MapScreen inside SafeAreaView', () => {
    const { UNSAFE_getByType } = render(<App />);
    const mapScreen = UNSAFE_getByType(MapScreen);
    expect(mapScreen).toBeTruthy();
  });
});
