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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // When the API returns EMAIL_NOT_VERIFIED we switch into "unverified" mode
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
      // AuthContext updates → _layout.tsx redirects to (tabs)
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
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>UV</Text>
          </View>
          <Text style={styles.appName}>Ughelli Vibes</Text>
          <Text style={styles.tagline}>Your local news network</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Welcome back</Text>

          {/* Generic error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email-not-verified banner */}
          {unverifiedEmail ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Email not verified</Text>
              <Text style={styles.warningBody}>
                Check your inbox for the verification link we sent to{' '}
                <Text style={styles.warningEmail}>{unverifiedEmail}</Text>.
              </Text>

              {resendState === 'sent' ? (
                <Text style={styles.sentText}>✓ A new link has been sent — check your inbox.</Text>
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
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="john@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setUnverifiedEmail(null);
                setResendState('idle');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />
          </View>

          <Pressable onPress={() => router.push('/auth/forgot-password')} style={styles.forgotLink}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/auth/signup')}>
            <Text style={styles.link}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PRIMARY = '#0F8A5F';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold' },
  appName: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1A1A2E' },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 4, fontFamily: 'Inter_400Regular' },

  form: { flex: 1 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1A1A2E', marginBottom: 24 },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 14, fontFamily: 'Inter_400Regular' },

  warningBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  warningBody: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#78350F', lineHeight: 18 },
  warningEmail: { fontFamily: 'Inter_600SemiBold' },
  resendBtn: { marginTop: 10, alignSelf: 'flex-start' },
  resendBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: PRIMARY,
    textDecorationLine: 'underline',
  },
  sentText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#065F46',
  },

  field: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'Inter_500Medium', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A2E',
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  button: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },

  forgotLink: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  link: { fontSize: 14, color: PRIMARY, fontFamily: 'Inter_600SemiBold' },
});
