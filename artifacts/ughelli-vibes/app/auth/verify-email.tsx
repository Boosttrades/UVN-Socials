import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';

const PRIMARY = '#0F8A5F';
const PRIMARY_DARK = '#066A46';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';

  const cardBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,138,95,0.20)';
  const iconBg     = isDark ? 'rgba(15,138,95,0.20)' : '#E8F5F0';
  const accentText = isDark ? '#22C58B' : PRIMARY;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name="mail" size={48} color={accentText} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          We sent a verification link to your email address. Click the link to activate your account,
          then come back here to log in.
        </Text>

        <View style={[styles.note, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.muted }]}>
          <Feather name="info" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>The link expires in 24 hours.</Text>
        </View>

        <Pressable style={styles.button} onPress={() => router.replace('/auth/login')}>
          <LinearGradient
            colors={[PRIMARY, PRIMARY_DARK]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 36,
    width: '100%',
  },
  noteText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  button: { borderRadius: 12, overflow: 'hidden', width: '100%' },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
