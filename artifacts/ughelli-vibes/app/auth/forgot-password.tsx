import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';

const PRIMARY = '#0F8A5F';
const PRIMARY_DARK = '#066A46';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forgotPassword } = useAuth();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const cardBg      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,138,95,0.20)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.70)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : colors.border;
  const accentText  = isDark ? '#22C58B' : PRIMARY;
  const iconBg      = isDark ? 'rgba(15,138,95,0.20)' : '#E8F5F0';

  async function handleSubmit() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>

          {sent ? (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.centerContent}>
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <Feather name="mail" size={40} color={accentText} />
                </View>
                <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  If an account exists for{' '}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{email.trim()}</Text>
                  , we've sent a link to reset your password. The link expires in 1 hour.
                </Text>
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
          ) : (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.title, { color: colors.foreground }]}>Forgot password?</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Enter the email you signed up with and we'll send you a link to reset your password.
              </Text>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#FECACA' }]}>
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="john@email.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                </View>
              </View>

              <Pressable
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={[PRIMARY, PRIMARY_DARK]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset link</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 24 },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  centerContent: { alignItems: 'center' },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 12, textAlign: 'left' },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22, marginBottom: 24 },

  errorBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: { fontSize: 14, fontFamily: 'Inter_400Regular' },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 8, letterSpacing: 0.2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },

  button: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
