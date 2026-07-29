import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { ApiError } from '@/utils/api';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SW, height: SH } = Dimensions.get('window');

const PRIMARY = '#0F8A5F';
const PRIMARY_DARK = '#066A46';

export default function LoginScreen() {
  const router = useRouter();
  const { login, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Adaptive glass values
  const cardBg      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,138,95,0.20)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.70)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : colors.border;
  const accentText  = isDark ? '#22C58B' : PRIMARY;

  async function handleLogin() {
    if (!identifier.trim() || !password) {
      setError('Please enter your email or username and password.');
      return;
    }
    setError('');
    setUnverifiedEmail(null);
    setResendState('idle');
    setLoading(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        const emailFromServer =
          typeof err.data?.email === 'string' ? err.data.email : identifier.trim();
        setUnverifiedEmail(emailFromServer);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!unverifiedEmail || resendState !== 'idle') return;
    setResendState('sending');
    try {
      await resendVerification(unverifiedEmail);
      setResendState('sent');
    } catch {
      setResendState('idle');
      setError('Could not resend the email. Please try again.');
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Subtle radial glow behind the card — adapts to mode */}
      <View
        style={[
          styles.glowSpot,
          { backgroundColor: isDark ? '#0F8A5F' : '#0F8A5F', opacity: isDark ? 0.08 : 0.05 },
        ]}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={[styles.logoRing, { borderColor: accentText + '66' }]}>
              <LinearGradient
                colors={[PRIMARY, PRIMARY_DARK]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="zap" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]}>
              Ughelli <Text style={{ color: accentText }}>Vibes</Text>
            </Text>
            <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Your local news network</Text>
          </View>

          {/* Glass card */}
          <View
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: cardBorder },
              Platform.select({
                ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: isDark ? 0.3 : 0.12, shadowRadius: 24 },
                android: { elevation: 8 },
              }),
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome back</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>Sign in to stay connected with your community</Text>

            {/* Generic error */}
            {error ? (
              <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#FECACA' }]}>
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            {/* Email-not-verified banner */}
            {unverifiedEmail ? (
              <View style={[styles.warningBox, { backgroundColor: isDark ? 'rgba(251,191,36,0.10)' : '#FFFBEB', borderColor: isDark ? 'rgba(251,191,36,0.20)' : '#FDE68A' }]}>
                <Feather name="mail" size={14} color={colors.warning} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warningTitle, { color: colors.warning }]}>Email not verified</Text>
                  <Text style={[styles.warningBody, { color: colors.mutedForeground }]}>
                    Check your inbox for the link we sent to{' '}
                    <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>{unverifiedEmail}</Text>.
                  </Text>
                  {resendState === 'sent' ? (
                    <Text style={[styles.sentText, { color: accentText }]}>✓ New link sent — check your inbox.</Text>
                  ) : (
                    <Pressable
                      onPress={handleResend}
                      disabled={resendState === 'sending'}
                      style={styles.resendBtn}
                    >
                      {resendState === 'sending' ? (
                        <ActivityIndicator size="small" color={accentText} />
                      ) : (
                        <Text style={[styles.resendBtnText, { color: accentText }]}>Resend verification email</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email or Username</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Feather name="user" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="john@email.com or username"
                  placeholderTextColor={colors.mutedForeground}
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    setUnverifiedEmail(null);
                    setResendState('idle');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput, { color: colors.foreground }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/auth/forgot-password')}
              style={styles.forgotLink}
            >
              <Text style={[styles.link, { color: accentText }]}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
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
                  <>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/auth/signup')}>
              <Text style={[styles.link, { color: accentText }]}>Sign up free</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  glowSpot: {
    position: 'absolute',
    top: SH * 0.28,
    left: SW * 0.1,
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
  },
  container: { flexGrow: 1, paddingHorizontal: 24 },

  brand: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    padding: 4,
    marginBottom: 16,
  },
  logoGradient: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 14,
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.2,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 3,
  },
  warningBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  resendBtn: { marginTop: 10, alignSelf: 'flex-start' },
  resendBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textDecorationLine: 'underline',
  },
  sentText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },

  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  passwordInput: { paddingRight: 8 },
  eyeBtn: { padding: 6 },

  forgotLink: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  link: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  button: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
