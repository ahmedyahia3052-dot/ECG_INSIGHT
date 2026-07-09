import { Feather } from "@expo/vector-icons";
import React, { memo, RefObject } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { GlobalSearchResult } from "@/services/search";

import { MedicalCard } from "../components/cards";
import { useDesignTokens } from "../hooks/useDesignTokens";
import { useThemeEngine } from "../theme-engine";
import { Text } from "../primitives/Text";
import { Stack } from "../primitives/Stack";
import { searchResultIcon, searchResultTypeLabel } from "./shell-utils";
import type { ShellPageMeta } from "./types";

type Props = {
  breadcrumb: string;
  isMobile: boolean;
  onClearSearch: () => void;
  onFocusSearch: (focused: boolean) => void;
  onOpenDrawer: () => void;
  onOpenSearchResult: (result: GlobalSearchResult) => void;
  onSearchSubmit: () => void;
  onSearchTextChange: (value: string) => void;
  onSelectRecentSearch: (value: string) => void;
  onToggleNotifications: () => void;
  pageMeta: ShellPageMeta;
  recentSearches: string[];
  searchFocused: boolean;
  searchInputRef: RefObject<TextInput | null>;
  searchQueryError: boolean;
  searchQueryLoading: boolean;
  searchResults: GlobalSearchResult[];
  searchText: string;
  showSearchPanel: boolean;
  unreadCount: number;
};

export const BoltHeader = memo(function BoltHeader({
  breadcrumb,
  isMobile,
  onClearSearch,
  onFocusSearch,
  onOpenDrawer,
  onOpenSearchResult,
  onSearchSubmit,
  onSearchTextChange,
  onSelectRecentSearch,
  onToggleNotifications,
  pageMeta,
  recentSearches,
  searchFocused,
  searchInputRef,
  searchQueryError,
  searchQueryLoading,
  searchResults,
  searchText,
  showSearchPanel,
  unreadCount,
}: Props) {
  const tokens = useDesignTokens();
  const insets = useSafeAreaInsets();
  const { resolvedThemeId, setThemeId, themeId } = useThemeEngine();

  const toggleTheme = () => {
    if (themeId === "dark" || themeId === "system") {
      setThemeId("light");
      return;
    }
    setThemeId("dark");
  };

  return (
    <View
      style={{
        alignItems: "center",
        borderBottomColor: tokens.colors.border.default,
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: tokens.spacing.inset.sm,
        paddingBottom: tokens.spacing.inset.md,
        paddingHorizontal: tokens.spacing.inset.lg,
        paddingTop: isMobile ? insets.top + 12 : 18,
      }}
      testID="bolt-header"
    >
      {isMobile ? (
        <Pressable
          accessibilityLabel="Open navigation"
          accessibilityRole="button"
          onPress={onOpenDrawer}
          style={{
            alignItems: "center",
            backgroundColor: tokens.colors.surface.card,
            borderColor: tokens.colors.border.default,
            borderRadius: tokens.radii.card,
            borderWidth: 1,
            height: 44,
            justifyContent: "center",
            width: 44,
          }}
        >
          <Feather color={tokens.colors.text.primary} name="menu" size={20} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: tokens.colors.medical.primary }} variant="small">{breadcrumb}</Text>
        <Text variant="display">{pageMeta.title}</Text>
        <Text tone="muted" variant="body">{pageMeta.subtitle}</Text>
      </View>

      <Stack direction="row" gap={8} style={{ alignItems: "center" }}>
        <View style={{ position: "relative", zIndex: 95 }}>
          <View
            style={{
              alignItems: "center",
              backgroundColor: tokens.colors.surface.card,
              borderColor: searchFocused ? tokens.colors.border.focus : tokens.colors.border.default,
              borderRadius: tokens.radii.card,
              borderWidth: 1,
              flexDirection: "row",
              gap: 8,
              minHeight: 44,
              paddingHorizontal: tokens.spacing.inset.sm,
              width: isMobile ? 180 : 280,
            }}
          >
            <Feather color={tokens.colors.text.secondary} name="search" size={16} />
            <TextInput
              accessibilityLabel="Global search"
              onBlur={() => setTimeout(() => onFocusSearch(false), 140)}
              onChangeText={onSearchTextChange}
              onFocus={() => onFocusSearch(true)}
              onSubmitEditing={onSearchSubmit}
              placeholder="Search patient, ECG ID, report..."
              placeholderTextColor={tokens.colors.text.secondary}
              ref={searchInputRef}
              returnKeyType="search"
              style={{ color: tokens.colors.text.primary, flex: 1, fontSize: 13 }}
              value={searchText}
            />
            {searchText ? (
              <Pressable accessibilityLabel="Clear search" onPress={onClearSearch}>
                <Feather color={tokens.colors.text.secondary} name="x" size={15} />
              </Pressable>
            ) : (
              <Text tone="muted" variant="small">Ctrl+K</Text>
            )}
          </View>
          {showSearchPanel ? (
            <MedicalCard style={{ gap: 6, maxHeight: 430, padding: 10, position: "absolute", right: 0, top: 52, width: isMobile ? 280 : 380, zIndex: 90 }}>
              {searchText.trim().length < 2 ? (
                <>
                  <Text variant="caption">Recent searches</Text>
                  {recentSearches.length ? recentSearches.map((item) => (
                    <Pressable key={item} onPress={() => onSelectRecentSearch(item)} style={{ alignItems: "center", flexDirection: "row", gap: 9, minHeight: 38, paddingHorizontal: 10 }}>
                      <Feather color={tokens.colors.medical.primary} name="clock" size={14} />
                      <Text variant="body">{item}</Text>
                    </Pressable>
                  )) : (
                    <Text tone="muted" variant="caption">Start typing to search patients, ECG cases, reports, organizations, and doctors.</Text>
                  )}
                </>
              ) : searchQueryLoading ? (
                <Text tone="muted" variant="caption">Searching clinical workspace...</Text>
              ) : searchQueryError ? (
                <Text style={{ color: tokens.colors.medical.critical }} variant="caption">Search is temporarily unavailable. Please try again.</Text>
              ) : searchResults.length ? (
                searchResults.map((result) => (
                  <Pressable key={`${result.type}-${result.id}`} onPress={() => onOpenSearchResult(result)} style={{ alignItems: "center", flexDirection: "row", gap: 10, padding: 9 }}>
                    <View style={{ alignItems: "center", backgroundColor: tokens.colors.surface.toolbar, borderColor: tokens.colors.border.default, borderRadius: tokens.radii.sm, borderWidth: 1, height: 34, justifyContent: "center", width: 34 }}>
                      <Feather color={tokens.colors.medical.primary} name={searchResultIcon(result.type)} size={15} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} variant="subtitle">{result.title}</Text>
                      <Text numberOfLines={1} tone="muted" variant="caption">
                        {searchResultTypeLabel(result.type)}{result.meta ? ` • ${result.meta}` : ""}{result.subtitle ? ` • ${result.subtitle}` : ""}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text tone="muted" variant="caption">No matching clinical records found.</Text>
              )}
            </MedicalCard>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel={`Toggle theme (${resolvedThemeId})`}
          accessibilityRole="button"
          onPress={toggleTheme}
          style={{
            alignItems: "center",
            backgroundColor: tokens.colors.surface.card,
            borderColor: tokens.colors.border.default,
            borderRadius: tokens.radii.card,
            borderWidth: 1,
            height: 44,
            justifyContent: "center",
            width: 44,
          }}
        >
          <Feather color={tokens.colors.text.primary} name={resolvedThemeId === "light" ? "sun" : "moon"} size={18} />
        </Pressable>

        <Pressable
          accessibilityLabel="Notifications"
          accessibilityRole="button"
          onPress={onToggleNotifications}
          style={{
            alignItems: "center",
            backgroundColor: tokens.colors.surface.card,
            borderColor: tokens.colors.border.default,
            borderRadius: tokens.radii.card,
            borderWidth: 1,
            height: 44,
            justifyContent: "center",
            width: 44,
          }}
        >
          <Feather color={tokens.colors.text.primary} name="bell" size={18} />
          {unreadCount ? (
            <View style={{ alignItems: "center", backgroundColor: tokens.colors.medical.critical, borderRadius: 999, minWidth: 18, paddingHorizontal: 4, position: "absolute", right: 5, top: 4 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "900" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </Stack>
    </View>
  );
});
