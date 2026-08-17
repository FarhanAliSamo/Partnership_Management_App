import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/useTheme';
import { radii, spacing } from '@/theme';
import { parseISODate, toISODate, formatDateDisplay } from '@/utils/date';

/**
 * Native date picker field. Android shows the platform date dialog;
 * iOS (and web) uses an inline DateTimePicker fallback.
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
}) {
  const palette = useTheme();
  const [open, setOpen] = useState(false);

  const parsed = parseISODate(value);

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (date) onChange(toISODate(date));
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Date'}
        style={{
          backgroundColor: palette.surfaceAlt,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: palette.text, fontSize: 16 }}>{formatDateDisplay(value)}</Text>
        <Text style={{ color: palette.textMuted, fontSize: 14 }}>📅</Text>
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker value={parsed} mode="date" onChange={handleChange} display="default" />
      ) : null}
      {open && Platform.OS !== 'android' ? (
        <DateTimePicker value={parsed} mode="date" onChange={handleChange} display="inline" />
      ) : null}
    </View>
  );
}

/**
 * Money input: numeric-only, tuned for accounting amounts.
 * Accepts major units (e.g. "8500") and stores via the parent.
 */
export function MoneyField({
  label,
  value,
  onChangeText,
  placeholder = '0',
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const palette = useTheme();

  const sanitize = (text: string) => {
    // digits + at most one dot
    let cleaned = text.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    }
    return cleaned;
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: palette.surfaceAlt,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
        }}
      >
        <Text style={{ color: palette.textMuted, fontSize: 16, marginRight: 8 }}>Rs.</Text>
        <Pressable style={{ flex: 1, paddingVertical: 12 }}>
          <TextInputMoney value={value} onChangeText={(t) => onChangeText(sanitize(t))} placeholder={placeholder} />
        </Pressable>
      </View>
    </View>
  );
}

import { TextInput } from 'react-native';

function TextInputMoney({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}) {
  const palette = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textMuted}
      keyboardType="decimal-pad"
      inputMode="decimal"
      style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}
    />
  );
}