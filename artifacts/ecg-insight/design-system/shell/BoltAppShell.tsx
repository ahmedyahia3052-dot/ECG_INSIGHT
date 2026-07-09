import React, { memo } from "react";
import { ScrollView, View } from "react-native";

import { DesignSystemProvider } from "../providers";
import { useDesignTokens } from "../hooks/useDesignTokens";
import { BoltHeader } from "./BoltHeader";
import { BoltMobileDrawer, BoltSidebar } from "./BoltSidebar";
import { BoltNotificationPanel } from "./BoltNotificationPanel";
import type { BoltAppShellProps } from "./types";

function BoltAppShellFrame(props: BoltAppShellProps) {
  const tokens = useDesignTokens();
  const {
    children,
    closeDrawer,
    drawerOpen,
    hideSidebar,
    isFullBleedWorkspace,
    isMobile,
  } = props;

  const sidebarNode = (
    <BoltSidebar
      compact={props.sidebarCompact}
      isMobile={isMobile}
      navItems={props.navItems}
      onLogout={props.onLogout}
      onNavigate={props.onNavigate}
      onToggleCollapsed={props.toggleSidebarCollapsed}
      pathname={props.pathname}
      unreadCount={props.unreadCount}
      user={props.user}
    />
  );

  return (
    <View style={{ backgroundColor: tokens.colors.surface.background, flex: 1, flexDirection: "row" }} testID="bolt-app-shell">
      {!hideSidebar && !isMobile ? sidebarNode : null}
      <BoltMobileDrawer onClose={closeDrawer} open={isMobile && drawerOpen}>
        {sidebarNode}
      </BoltMobileDrawer>

      <View style={{ backgroundColor: tokens.colors.surface.background, flex: 1, minWidth: 0, overflow: isFullBleedWorkspace ? "hidden" : undefined }}>
        {!isFullBleedWorkspace ? (
          <>
            <BoltHeader
              breadcrumb={props.breadcrumb}
              isMobile={isMobile}
              onClearSearch={() => props.onSearchTextChange("")}
              onFocusSearch={props.focusSearch}
              onOpenDrawer={props.openDrawer}
              onOpenSearchResult={props.onOpenSearchResult}
              onSearchSubmit={() => {
                const firstResult = props.searchResults[0];
                if (firstResult) props.onOpenSearchResult(firstResult);
                else props.onRememberSearch(props.searchText);
              }}
              onSearchTextChange={props.onSearchTextChange}
              onSelectRecentSearch={props.onSearchTextChange}
              onToggleNotifications={props.toggleNotificationCenter}
              pageMeta={props.pageMeta}
              recentSearches={props.recentSearches}
              searchFocused={props.searchFocused}
              searchInputRef={props.searchInputRef}
              searchQueryError={props.searchQueryError}
              searchQueryLoading={props.searchQueryLoading}
              searchResults={props.searchResults}
              searchText={props.searchText}
              showSearchPanel={props.showSearchPanel}
              unreadCount={props.unreadCount}
            />
            <ScrollView contentContainerStyle={{ gap: tokens.spacing.inset.md, padding: tokens.spacing.inset.lg, paddingBottom: 42 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </>
        ) : (
          <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</View>
        )}
      </View>

      <BoltNotificationPanel
        criticalCount={props.criticalCount}
        expandedNotificationId={props.expandedNotificationId}
        filteredNotifications={props.filteredNotifications}
        isMobile={isMobile}
        notificationFilter={props.notificationFilter}
        notificationOpen={props.notificationOpen}
        notificationQueryError={props.notificationQueryError}
        notificationQueryLoading={props.notificationQueryLoading}
        notificationQueryRefetching={props.notificationQueryRefetching}
        notificationSearch={props.notificationSearch}
        notificationsTotal={props.notificationsTotal}
        onArchive={props.onArchiveNotification}
        onClose={props.closeNotificationCenter}
        onExpand={props.onNotificationExpand}
        onMarkAllRead={props.onMarkAllNotificationsRead}
        onMarkRead={props.onMarkNotificationRead}
        onNavigateHistory={() => props.onNavigate("/notifications")}
        onOpen={props.onOpenNotification}
        onRefetch={props.onRefetchNotifications}
        onSetFilter={props.onSetNotificationFilter}
        onSetSearch={props.onSetNotificationSearch}
        readAllPending={props.readAllPending}
        unreadCount={props.unreadCount}
      />
    </View>
  );
}

export const BoltAppShell = memo(function BoltAppShell(props: BoltAppShellProps) {
  return (
    <DesignSystemProvider>
      <BoltAppShellFrame {...props} />
    </DesignSystemProvider>
  );
});
