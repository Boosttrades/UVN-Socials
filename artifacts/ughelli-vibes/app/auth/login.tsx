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
import NetworkBackground from '@/components/NetworkBackground';

const { width: SW, height: SH } = Dimensions.get('window');

const PRIMARY = '#0F8A5F';
const PRIMARY_DARK = '#066A46';
const BG_TOP = '#061A12';
const BG_BOTTOM = '#0A2E1E';

export default function LoginScreen() {
  const router = useRouter();
  const { login, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

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
    <View style={styles.root}>
      {/* Deep green gradient background */}
      <LinearGradient
        colors={[BG_TOP, BG_BOTTOM]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Animated 3D network */}
      <NetworkBackground
        color="#22C58B"
        opacity={0.18}
        nodeCount={28}
        maxDistance={140}
        width={SW}
        height={SH}
      />

      {/* Subtle radial glow behind the card */}
      <View style={styles.glowSpot} pointerEvents="none" />

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
            <View style={styles.logoRing}>
              <LinearGradient
                colors={[PRIMARY, PRIMARY_DARK]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="zap" size={32} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>
              Ughelli <Text style={styles.appNameAccent}>Vibes</Text>
            </Text>
            <Text style={styles.tagline}>Your local news network</Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to stay connected with your community</Text>

            {/* Generic error */}
            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#F87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Email-not-verified banner */}
            {unverifiedEmail ? (
              <View style={styles.warningBox}>
                <Feather name="mail" size={14} color="#FBBF24" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Email not verified</Text>
                  <Text style={styles.warningBody}>
                    Check your inbox for the link we sent to{' '}
                    <Text style={styles.warningEmail}>{unverifiedEmail}</Text>.
                  </Text>
                  {resendState === 'sent' ? (
                    <Text style={styles.sentText}>✓ New link sent — check your inbox.</Text>
                  ) : (
                    <Pressable
                      onPress={handleResend}
                      disabled={resendState === 'sending'}
                      style={styles.resendBtn}
                    >
                      {resendState === 'sending' ? (
                        <ActivityIndicator size="small" color={PRIMARY} />
                      ) : (
                        <Text style={styles.resendBtnText}>Resend verification email</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email or Username</Text>
              <View style={styles.inputWrapper}>
                <Feather name="user" size={16} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="john@email.com or username"
                  placeholderTextColor="#6B7280"
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
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={16} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor="#6B7280"
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
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/auth/forgot-password')}
              style={styles.forgotLink}
            >
              <Text style={styles.link}>Forgot password?</Text>
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
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/auth/signup')}>
              <Text style={styles.link}>Sign up free</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_TOP },
  flex: { flex: 1 },
  glowSpot: {
    position: 'absolute',
    top: SH * 0.28,
    left: SW * 0.1,
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
    backgroundColor: '#0F8A5F',
    opacity: 0.08,
  },
  container: { flexGrow: 1, paddingHorizontal: 24 },

  brand: { alignItems: 'center', marginBottom: 32 },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(34,197,139,0.4)',
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
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  appNameAccent: { color: '#22C58B' },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 24,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  errorText: { color: '#F87171', fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
  },
  warningTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#FBBF24',
    marginBottom: 3,
  },
  warningBody: { fontSize: 12, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.6)', lineHeight: 17 },
  warningEmail: { fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.8)' },
  resendBtn: { marginTop: 10, alignSelf: 'flex-start' },
  resendBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#22C58B',
    textDecorationLine: 'underline',
  },
  sentText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#22C58B',
  },

  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Inter_400Regular',
  },
  passwordInput: { paddingRight: 8 },
  eyeBtn: {
    padding: 6,
  },

  forgotLink: { alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 },
  link: { fontSize: 13, color: '#22C58B', fontFamily: 'Inter_600SemiBold' },

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
  footerText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular' },
});
