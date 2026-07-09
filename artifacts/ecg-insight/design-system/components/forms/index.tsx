import React, { memo } from "react";
import { Pressable, Switch as RNSwitch, TextInput, type TextInputProps } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";
import { Stack } from "../../primitives/Stack";

function fieldStyle(tokens: ReturnType<typeof useDesignTokens>) {
  return {
    backgroundColor: tokens.colors.surface.card,
    borderColor: tokens.colors.border.default,
    borderRadius: tokens.radii.clinical,
    borderWidth: 1,
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.variants.body.fontSize,
    minHeight: 40,
    paddingHorizontal: tokens.spacing.inset.md,
    paddingVertical: tokens.spacing.inset.sm,
  };
}

export const Input = memo(function Input(props: TextInputProps) {
  const tokens = useDesignTokens();
  return <TextInput accessibilityLabel={props.accessibilityLabel} placeholderTextColor={tokens.colors.text.secondary} style={fieldStyle(tokens)} {...props} />;
});

export const Textarea = memo(function Textarea(props: TextInputProps) {
  const tokens = useDesignTokens();
  return <TextInput multiline style={[fieldStyle(tokens), { minHeight: 96, textAlignVertical: "top" }]} {...props} />;
});

export const SearchInput = memo(function SearchInput(props: TextInputProps) {
  return <Input accessibilityLabel="Search" placeholder="Search…" testID="ds-form-search" {...props} />;
});

export const Select = memo(function Select({ label }: { label: string }) {
  return (
    <Stack gap={4}>
      <Text variant="caption">{label}</Text>
      <Input accessibilityLabel={label} editable={false} value="Select option" />
    </Stack>
  );
});

export const Checkbox = memo(function Checkbox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle}>
      <Stack direction="row" gap={8}>
        <Text variant="body">{checked ? "☑" : "☐"}</Text>
        <Text variant="body">{label}</Text>
      </Stack>
    </Pressable>
  );
});

export const Switch = memo(function Switch({ label, value, onValueChange }: { label: string; onValueChange: (next: boolean) => void; value: boolean }) {
  const tokens = useDesignTokens();
  return (
    <Stack direction="row" gap={8}>
      <Text variant="body">{label}</Text>
      <RNSwitch accessibilityLabel={label} onValueChange={onValueChange} trackColor={{ true: tokens.colors.medical.primary, false: tokens.colors.gray[700] }} value={value} />
    </Stack>
  );
});

export const Radio = memo(function Radio({ label, selected }: { label: string; selected: boolean }) {
  return (
    <Stack direction="row" gap={8}>
      <Text variant="body">{selected ? "◉" : "○"}</Text>
      <Text variant="body">{label}</Text>
    </Stack>
  );
});

export const DatePickerField = memo(function DatePickerField({ label, value }: { label: string; value: string }) {
  return <Input accessibilityLabel={label} editable={false} value={value} />;
});

export const UploadField = memo(function UploadField({ label }: { label: string }) {
  return <Input accessibilityLabel={label} editable={false} placeholder="Upload file…" />;
});
