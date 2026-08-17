import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToastStore } from '@/stores/useToastStore';
import { useTheme } from '@/theme/useTheme';

/**
 * Global toast/snackbar host. Renders a small stack of transient messages
 * at the bottom of the screen (Android-friendly, not modal).
 */
export function ToastHost() {
  const palette = useTheme();
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <SafeAreaView
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
      edges={['bottom']}
    >
      <View
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          gap: 8,
        }}
      >
        {toasts.map((t) => {
          const bg =
            t.tone === 'success'
              ? palette.success
              : t.tone === 'error'
                ? palette.danger
                : palette.info;
          return (
            <View
              key={t.id}
              style={{
                backgroundColor: bg,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                {t.message}
              </Text>
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}