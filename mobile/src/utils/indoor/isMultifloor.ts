export const isMultiFloor = (pathSteps: { icon: string; label: string }[]): boolean => {
  
  for (const step of pathSteps) {
    const hasStairs = step.label.includes('Stairs')
    const hasElevators = step.label.includes('Elevator')
    if (hasStairs || hasElevators) {
      return true;
    }
  }
  return false;
};
