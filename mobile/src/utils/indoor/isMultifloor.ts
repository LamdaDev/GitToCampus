export const isMultiFloor = (pathSteps: { icon: string; label: string }[]): boolean => {
  for (const step of pathSteps) {
    if (step.label.includes('Stairs') || step.label.includes('Elevator')) {
      return true;
    }
  }
  return false;
};
