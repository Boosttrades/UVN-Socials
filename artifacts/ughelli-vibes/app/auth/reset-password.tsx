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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';

const PRIMARY = '#0F8A5F';
const PRIMARY_DARK = '#066A46';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resetPassword } = useAuth();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const cardBg      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,138,95,0.20)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.70)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : colors.border;
  const accentText  = isDark ? '#22C58B' : PRIMARY;
  const iconBg      = isDark ? 'rgba(15,138,95,0.20)' : '#E8F5F0';

  async function handleSubmit() {
    if (!token) {
      setError('This reset link is missing its token. Please request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {done ? (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.centerContent}>
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <Feather name="check-circle" size={40} color={accentText} />
                </View>
                <Text style={[styles.title, { color: colors.foreground }]}>Password reset</Text>
                <Text style={[styles.body, { color: colors.mutedForeground }]}>
                  Your password has been updated. Log in with your new password.
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
              <Text style={[styles.title, { color: colors.foreground }]}>Set a new password</Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Choose a new password for your account.
              </Text>

              {!token ? (
                <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#FECACA' }]}>
                  <Text style={[styles.errorText, { color: colors.destructive }]}>
                    This link is missing its reset token. Open the link from your email again, or request a new one.
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#FECACA' }]}>
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>New password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    textContentType="newPassword"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm new password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.mutedForeground}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    textContentType="newPassword"
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
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset password</Text>
                  )}
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
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },

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

  title: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 12 },
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
