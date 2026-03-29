import CC_1 from '../assets/floor_plans/CC_1.svg';

import H_1 from '../assets/floor_plans/H_1.svg';
import H_2 from '../assets/floor_plans/H_2.svg';
import H_8 from '../assets/floor_plans/H_8.svg';
import H_9 from '../assets/floor_plans/H_9.svg';

import MB_1 from '../assets/floor_plans/MB_1.png';
import MB_S2 from '../assets/floor_plans/MB_S2.png';

import VE_1 from '../assets/floor_plans/VE_1.svg';
import VE_2 from '../assets/floor_plans/VE_2.svg';

import VL_1 from '../assets/floor_plans/VL_1.png';
import VL_2 from '../assets/floor_plans/VL_2.png';

type FloorPlanDefinition =
  | {
      type: 'svg';
      data: typeof CC_1;
      viewBox: { width: number; height: number };
    }
  | {
      type: 'png';
      data: typeof MB_1;
    };

const buildFloorPlans = () =>
  ({
    CC: {
      1: { type: 'svg', data: CC_1, viewBox: { width: 4096, height: 1024 } },
    },
    H: {
      1: { type: 'svg', data: H_1, viewBox: { width: 1024, height: 1024 } },
      2: { type: 'svg', data: H_2, viewBox: { width: 1024, height: 1024 } },
      8: { type: 'svg', data: H_8, viewBox: { width: 1024, height: 1024 } },
      9: { type: 'svg', data: H_9, viewBox: { width: 1024, height: 1024 } },
    },
    MB: {
      S2: { type: 'png', data: MB_S2 },
      1: { type: 'png', data: MB_1 },
    },
    VE: {
      1: { type: 'svg', data: VE_1, viewBox: { width: 1024, height: 1024 } },
      2: { type: 'svg', data: VE_2, viewBox: { width: 1024, height: 1024 } },
    },
    VL: {
      1: { type: 'png', data: VL_1 },
      2: { type: 'png', data: VL_2 },
    },
  }) as const;

export type FloorPlanCatalog = ReturnType<typeof buildFloorPlans>;
export type FloorPlanBuildingKey = keyof FloorPlanCatalog;
export type FloorPlanLevels<T extends FloorPlanBuildingKey> = FloorPlanCatalog[T];
export type FloorPlanLevel<T extends FloorPlanBuildingKey> = keyof FloorPlanLevels<T>;
export type AnyFloorPlanLevel = FloorPlanCatalog[FloorPlanBuildingKey][keyof FloorPlanCatalog[FloorPlanBuildingKey]];

export const getFloorPlans = (): FloorPlanCatalog => buildFloorPlans();

export const hasFloorPlans = (
  buildingCode: string | null | undefined,
): buildingCode is FloorPlanBuildingKey => {
  if (!buildingCode) return false;
  return Object.prototype.hasOwnProperty.call(buildFloorPlans(), buildingCode);
};

export const getFloorPlansForBuilding = (
  buildingCode: string | null | undefined,
): FloorPlanCatalog[FloorPlanBuildingKey] | null => {
  if (!hasFloorPlans(buildingCode)) return null;
  return buildFloorPlans()[buildingCode];
};

export const getFloorPlan = (
  buildingCode: string | null | undefined,
  floorLevel: string | null | undefined,
): AnyFloorPlanLevel | null => {
  if (!floorLevel) return null;

  const buildingFloorPlans = getFloorPlansForBuilding(buildingCode);
  if (!buildingFloorPlans) return null;

  return (
    buildingFloorPlans[floorLevel as unknown as keyof typeof buildingFloorPlans] ?? null
  ) as AnyFloorPlanLevel | null;
};

export const getFloorPlanBuildingKeys = (): FloorPlanBuildingKey[] =>
  Object.keys(buildFloorPlans()) as FloorPlanBuildingKey[];
