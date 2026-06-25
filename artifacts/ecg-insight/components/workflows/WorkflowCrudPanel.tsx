import { ApiError } from "@/services/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { SkeletonList, useToast } from "@/components/interaction/PremiumInteraction";

type WorkflowItem = { id?: string };

export interface WorkflowField {
  key: string;
  label: string;
  placeholder?: string;
}

interface WorkflowCrudPanelProps<TItem extends WorkflowItem> {
  createFields?: WorkflowField[];
  createItem?: (input: Record<string, string>) => Promise<unknown>;
  deleteItem?: (id: string) => Promise<unknown>;
  detailText?: (item: TItem) => string;
  emptyText: string;
  filters?: Array<{ key: string; label: string; options: Array<{ label: string; value: string }> }>;
  itemsFromResponse: (response: unknown) => TItem[];
  listItems: (params: URLSearchParams) => Promise<unknown>;
  queryKey: unknown[];
  searchPlaceholder?: string;
  subtitle?: string;
  title: string;
  titleForItem: (item: TItem) => string;
  updateFields?: WorkflowField[];
  updateItem?: (id: string, input: Record<string, string>) => Promise<unknown>;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return `${error.message} (${error.status})`;
  if (error instanceof Error) return error.message;
  return "Request failed.";
}

export function WorkflowCrudPanel<TItem extends WorkflowItem>({
  createFields = [],
  createItem,
  deleteItem,
  detailText,
  emptyText,
  filters = [],
  itemsFromResponse,
  listItems,
  queryKey,
  searchPlaceholder = "Search...",
  subtitle,
  title,
  titleForItem,
  updateFields = createFields,
  updateItem,
}: WorkflowCrudPanelProps<TItem>) {
  const colors = useColors();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"create" | "edit" | null>(null);

  const params = useMemo(() => {
    const value = new URLSearchParams();
    value.set("page", String(page));
    value.set("pageSize", "10");
    if (search.trim()) value.set("q", search.trim());
    for (const [key, filterValue] of Object.entries(filterValues)) {
      if (filterValue) value.set(key, filterValue);
    }
    return value;
  }, [filterValues, page, search]);

  const query = useQuery({
    queryFn: () => listItems(params),
    queryKey: [...queryKey, params.toString()],
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createItem) return undefined;
      return createItem(form);
    },
    onSuccess: async () => {
      setForm({});
      setMode(null);
      toast.success("Record created", `${title} was created successfully.`);
      await invalidate();
    },
    onError: (error) => toast.error("Create failed", errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!updateItem || !selected?.id) return undefined;
      return updateItem(selected.id, form);
    },
    onSuccess: async () => {
      setForm({});
      setMode(null);
      toast.success("Record updated", `${title} was updated successfully.`);
      await invalidate();
    },
    onError: (error) => toast.error("Update failed", errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!deleteItem) return undefined;
      return deleteItem(id);
    },
    onSuccess: async () => {
      toast.info("Record archived", `${title} was removed from the active list.`);
      await invalidate();
    },
    onError: (error) => toast.error("Delete failed", errorMessage(error)),
  });

  const items = itemsFromResponse(query.data);
  const fields = mode === "edit" ? updateFields : createFields;
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const startCreate = () => {
    setSelected(null);
    setForm({});
    setMode("create");
  };

  const startEdit = (item: TItem) => {
    setSelected(item);
    setForm(
      Object.fromEntries(
        updateFields.map((field) => {
          const value = (item as Record<string, unknown>)[field.key];
          return [field.key, value == null ? "" : String(value)];
        }),
      ),
    );
    setMode("edit");
  };

  const confirmDelete = (item: TItem) => {
    if (!item.id || !deleteItem) return;
    const performDelete = () => deleteMutation.mutate(item.id!);
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(`Delete ${titleForItem(item)}?`)) performDelete();
      return;
    }
    Alert.alert("Confirm delete", `Delete ${titleForItem(item)}?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: performDelete, style: "destructive", text: "Delete" },
    ]);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        </View>
        {createItem ? (
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={startCreate}>
            <Text style={styles.primaryButtonText}>Create</Text>
          </Pressable>
        ) : null}
      </View>

      <TextInput
        onChangeText={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        value={search}
      />

      {filters.map((filter) => (
        <View key={filter.key} style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>{filter.label}</Text>
          {filter.options.map((option) => {
            const active = filterValues[filter.key] === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setFilterValues((current) => ({ ...current, [filter.key]: active ? "" : option.value }));
                  setPage(1);
                }}
                style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.text }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}

      {query.isLoading ? (
        <SkeletonList count={3} />
      ) : query.isError ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: "#DC2626" }]}>
          <Text style={[styles.cardTitle, { color: "#DC2626" }]}>Unable to load</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{errorMessage(query.error)}</Text>
          <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => query.refetch()}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>No records found</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{emptyText}</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id ?? titleForItem(item)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{titleForItem(item)}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {detailText ? detailText(item) : JSON.stringify(item).slice(0, 240)}
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => setSelected(selected?.id === item.id ? null : item)}>
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Details</Text>
              </Pressable>
              {updateItem && item.id ? (
                <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => startEdit(item)}>
                  <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Edit</Text>
                </Pressable>
              ) : null}
              {deleteItem && item.id ? (
                <Pressable style={[styles.dangerButton, { borderColor: "#DC2626" }]} onPress={() => confirmDelete(item)}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              ) : null}
            </View>
            {selected?.id === item.id ? (
              <Text style={[styles.details, { color: colors.textSecondary }]}>{JSON.stringify(item, null, 2).slice(0, 1000)}</Text>
            ) : null}
          </View>
        ))
      )}

      <View style={styles.pagination}>
        <Pressable
          disabled={page === 1}
          onPress={() => setPage((current) => Math.max(1, current - 1))}
          style={[styles.secondaryButton, { borderColor: colors.border, opacity: page === 1 ? 0.5 : 1 }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Previous</Text>
        </Pressable>
        <Text style={[styles.pageText, { color: colors.textSecondary }]}>Page {page}</Text>
        <Pressable
          disabled={items.length < 10}
          onPress={() => setPage((current) => current + 1)}
          style={[styles.secondaryButton, { borderColor: colors.border, opacity: items.length < 10 ? 0.5 : 1 }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Next</Text>
        </Pressable>
      </View>

      {mode ? (
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{mode === "create" ? `Create ${title}` : `Edit ${title}`}</Text>
          {fields.map((field) => (
            <TextInput
              key={field.key}
              onChangeText={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
              placeholder={field.placeholder ?? field.label}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={form[field.key] ?? ""}
            />
          ))}
          <View style={styles.actions}>
            <Pressable
              disabled={isMutating}
              onPress={() => (mode === "create" ? createMutation.mutate() : updateMutation.mutate())}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isMutating ? 0.6 : 1 }]}
            >
              <Text style={styles.primaryButtonText}>{isMutating ? "Saving..." : "Save"}</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={() => setMode(null)}>
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
          </View>
          {createMutation.isError || updateMutation.isError ? (
            <Text style={styles.errorText}>{errorMessage(createMutation.error ?? updateMutation.error)}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  cardText: { fontSize: 13, lineHeight: 19 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "700" },
  dangerButton: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  dangerButtonText: { color: "#DC2626", fontSize: 13, fontWeight: "700" },
  details: { borderTopWidth: StyleSheet.hairlineWidth, fontFamily: "monospace", fontSize: 11, lineHeight: 16, paddingTop: 8 },
  errorText: { color: "#DC2626", fontSize: 13, lineHeight: 18 },
  filterLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  filterRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  formCard: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  headerText: { flex: 1, gap: 4 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  pageText: { fontSize: 13, fontWeight: "700" },
  pagination: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "center" },
  primaryButton: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  secondaryButton: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  secondaryButtonText: { fontSize: 13, fontWeight: "700" },
  section: { gap: 14 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 24, fontWeight: "800" },
});
