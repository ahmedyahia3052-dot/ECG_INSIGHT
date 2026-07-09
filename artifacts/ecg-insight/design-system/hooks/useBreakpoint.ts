import { useWindowDimensions } from "react-native";

import { breakpointTokens, resolveBreakpoint, type BreakpointToken } from "../tokens/breakpoints";

export function useBreakpoint(): {
  breakpoint: BreakpointToken;
  isDesktop: boolean;
  isLaptop: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isUltraWide: boolean;
  width: number;
} {
  const { width } = useWindowDimensions();
  const breakpoint = resolveBreakpoint(width);
  return {
    breakpoint,
    isDesktop: width >= breakpointTokens.desktop,
    isLaptop: width >= breakpointTokens.laptop,
    isMobile: width < breakpointTokens.tablet,
    isTablet: width >= breakpointTokens.tablet && width < breakpointTokens.laptop,
    isUltraWide: width >= breakpointTokens.ultraWide,
    width,
  };
}
