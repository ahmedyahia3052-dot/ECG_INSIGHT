import React, { memo } from "react";
import { View } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";
import { Stack } from "../../primitives/Stack";

type Column = { id: string; label: string; width?: number | `${number}%` };

export const EnterpriseTable = memo(function EnterpriseTable({ columns, rows }: { columns: Column[]; rows: Array<Record<string, string>> }) {
  const tokens = useDesignTokens();
  return (
    <View style={{ borderColor: tokens.colors.border.default, borderRadius: tokens.radii.card, borderWidth: 1, overflow: "hidden" }} testID="ds-table-enterprise">
      <Stack direction="row" gap={0} style={{ backgroundColor: tokens.colors.surface.toolbar, padding: tokens.spacing.inset.sm }}>
        {columns.map((column) => (
          <Text key={column.id} style={{ flex: 1, width: column.width }} variant="caption">{column.label}</Text>
        ))}
      </Stack>
      {rows.map((row, index) => (
        <Stack key={`row-${index}`} direction="row" gap={0} style={{ borderTopColor: tokens.colors.border.default, borderTopWidth: 1, padding: tokens.spacing.inset.sm }}>
          {columns.map((column) => (
            <Text key={column.id} style={{ flex: 1, width: column.width }} variant="body">{row[column.id] ?? "—"}</Text>
          ))}
        </Stack>
      ))}
    </View>
  );
});

export const MedicalTable = memo(function MedicalTable(props: React.ComponentProps<typeof EnterpriseTable>) {
  return <EnterpriseTable {...props} />;
});

export const TablePagination = memo(function TablePagination({ page, totalPages }: { page: number; totalPages: number }) {
  return <Text variant="caption">{`Page ${page} of ${totalPages}`}</Text>;
});

export const TableSorting = memo(function TableSorting({ column }: { column: string }) {
  return <Text variant="caption">{`Sorted by ${column}`}</Text>;
});

export const TableFiltering = memo(function TableFiltering({ query }: { query: string }) {
  return <Text variant="caption">{`Filter: ${query || "none"}`}</Text>;
});

export const ColumnSelector = memo(function ColumnSelector({ columns }: { columns: string[] }) {
  return <Text variant="caption">{`Columns: ${columns.join(", ")}`}</Text>;
});
