import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal as RNModal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/useTheme';
import { radii, spacing } from '@/theme';
import { format } from '@/services/calculation/money';

export function MoneyText({
  minor,
  currency = 'PKR',
  units = 2,
  signed = false,
  style,
}: {
  minor: number;
  currency?: string;
  units?: number;
  signed?: boolean;
  style?: object;
}) {
  const palette = useTheme();
  const sign = signed && minor > 0 ? '+' : '';
  const text = `${sign}${format(minor, currency, units)}`;
  return (
    <Text style={[{ color: palette.text, fontVariant: ['tabular-nums'] }, style]}>
      {text}
    </Text>
  );
}

export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const palette = useTheme();
  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: spacing.lg }}>{children}</View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  const palette = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        {
          backgroundColor: palette.surface,
          borderRadius: radii.md,
          padding: spacing.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
        pressed && { opacity: 0.96 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: object;
}) {
  const palette = useTheme();
  const bg =
    variant === 'primary'
      ? palette.info
      : variant === 'danger'
        ? palette.danger
        : variant === 'ghost'
          ? 'transparent'
          : palette.surfaceAlt;
  const fg = variant === 'ghost' ? palette.info : variant === 'secondary' ? palette.text : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radii.md,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '600', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  secureTextEntry,
  multiline,
  autoCapitalize,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'number-pad';
  error?: string | null;
  secureTextEntry?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const palette = useTheme();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text style={{ color: palette.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
        style={{
          backgroundColor: palette.surfaceAlt,
          borderRadius: radii.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          color: palette.text,
          borderWidth: 1,
          borderColor: error ? palette.danger : palette.border,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
      {error ? <Text style={{ color: palette.danger, fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  const palette = useTheme();
  const color =
    tone === 'success'
      ? palette.success
      : tone === 'warning'
        ? palette.warning
        : tone === 'danger'
          ? palette.danger
          : tone === 'info'
            ? palette.info
            : palette.textSecondary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: `${color}22`,
        borderRadius: radii.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function SheetModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const palette = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View
        style={{
          backgroundColor: palette.surface,
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          padding: spacing.xl,
          paddingBottom: spacing['3xl'],
        }}
      >
        {title ? (
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg }}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </RNModal>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const palette = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'], gap: 6 }}>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center' }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function LoadingState() {
  const palette = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'] }}>
      <ActivityIndicator color={palette.info} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const palette = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.md }}>
      <Text style={{ color: palette.textSecondary, fontSize: 14, textAlign: 'center' }}>{message}</Text>
      {onRetry ? <Button title="Retry" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.surfaceAlt,
        borderRadius: radii.sm,
        padding: 3,
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: radii.sm,
              alignItems: 'center',
              backgroundColor: active ? palette.info : 'transparent',
            }}
          >
            <Text
              style={{ color: active ? '#FFFFFF' : palette.textSecondary, fontSize: 13, fontWeight: '600' }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <TextField label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" />;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const palette = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl }}>
        <View style={{ backgroundColor: palette.surface, borderRadius: radii.lg, padding: spacing.xl }}>
          <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
          <Text style={{ color: palette.textSecondary, fontSize: 14, marginBottom: spacing.xl }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="secondary" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={confirmLabel} variant="danger" onPress={onConfirm} />
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const palette = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
      }}
    >
      <Text style={{ color: palette.text, fontSize: 16 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: palette.info }} />
    </View>
  );
}