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
import { ApiError } from '@/utils/api';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/contexts/ThemeContext';

const PRIMARY = '#0F8A5F';
const PRIMARY_DARK = '#066A46';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === 'dark';

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cardBg      = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,138,95,0.20)';
  const inputBg     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.70)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.12)' : colors.border;
  const accentText  = isDark ? '#22C58B' : PRIMARY;

  function update(field: keyof typeof form) {
    return (value: string) => setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSignup() {
    const { name, username, email, password } = form;
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await signup({ name: name.trim(), username: username.trim(), email: email.trim(), password });
      router.replace('/auth/verify-email');
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>

          {/* Header */}
          <Text style={[styles.title, { color: colors.foreground }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Join Ughelli Vibes — your local news network.
          </Text>

          {/* Error */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(248,113,113,0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.25)' : '#FECACA' }]}>
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {/* Glass card */}
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="John Okoro"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.name}
                  onChangeText={update('name')}
                  autoCapitalize="words"
                  textContentType="name"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Username</Text>
              <View style={[styles.usernameInputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Text style={[styles.usernamePrefix, { color: colors.mutedForeground }]}>@</Text>
                <TextInput
                  style={[styles.input, styles.usernameInput, { color: colors.foreground }]}
                  placeholder="john_ughelli"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.username}
                  onChangeText={(text) => update('username')(text.replace(/^@+/, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                />
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                Letters, numbers, and underscores only — must be unique
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="john@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.email}
                  onChangeText={update('email')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Password</Text>
              <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.password}
                  onChangeText={update('password')}
                  secureTextEntry
                  textContentType="newPassword"
                />
              </View>
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
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
                    <Text style={styles.buttonText}>Create Account</Text>
                    <Feather name="arrow-right" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.link, { color: accentText }]}>Log in</Text>
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
  container: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 24, width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 24 },

  errorBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: { fontSize: 14, fontFamily: 'Inter_400Regular' },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
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
  hint: { fontSize: 12, marginTop: 4, fontFamily: 'Inter_400Regular' },
  usernameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 14,
  },
  usernamePrefix: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  usernameInput: { paddingLeft: 4 },

  button: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
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
    marginTop: 4,
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  link: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
