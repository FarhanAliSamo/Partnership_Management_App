import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Image } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/useTheme';
import { radii, spacing } from '@/theme';
import { parseISODate, toISODate, formatDateDisplay } from '@/utils/date';
import { pickPhotos, type PickedPhoto } from '@/services/fileService';

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
        <Text style={{ color: palette.textMuted, fontSize: 14, fontWeight: '600', marginRight: 8 }}>PKR</Text>
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

/** Optional receipt/proof photos for earnings and expenses. Photos are saved after the record is created. */
export function PhotoPicker({
  photos,
  onChange,
  label = 'Photos (optional)',
}: {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  label?: string;
}) {
  const palette = useTheme();
  const choose = async (source: 'camera' | 'gallery') => {
    try {
      const picked = await pickPhotos(source);
      if (picked.length) onChange([...photos, ...picked].slice(0, 5));
    } catch {
      // Permission denial is non-destructive; the form remains usable without a photo.
    }
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>{label}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 8 }}>Add the daily calculation, receipt, or expense proof (up to 5).</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => choose('camera')} style={{ flex: 1, paddingVertical: 10, borderRadius: radii.sm, alignItems: 'center', backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.info, fontWeight: '600' }}>Take photo</Text>
        </Pressable>
        <Pressable onPress={() => choose('gallery')} style={{ flex: 1, paddingVertical: 10, borderRadius: radii.sm, alignItems: 'center', backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ color: palette.info, fontWeight: '600' }}>Choose photos</Text>
        </Pressable>
      </View>
      {photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {photos.map((photo) => (
            <Pressable key={photo.uri} onPress={() => onChange(photos.filter((item) => item.uri !== photo.uri))} accessibilityLabel="Remove photo">
              <Image source={{ uri: photo.uri }} style={{ width: 56, height: 56, borderRadius: radii.sm, backgroundColor: palette.surfaceAlt }} />
              <View style={{ position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: palette.danger, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>×</Text></View>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
