//Enable declaration of svg files (ex: import Hall8 from '../assets/floor_plans/hall8.svg')
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}