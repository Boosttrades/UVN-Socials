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
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      >
        {/* Back */}
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#1A1A2E" />
        </Pressable>

        {/* Header */}
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join Ughelli Vibes — your local news network.</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Fields */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Okoro"
            placeholderTextColor="#9CA3AF"
            value={form.name}
            onChangeText={update('name')}
            autoCapitalize="words"
            textContentType="name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="john_ughelli"
            placeholderTextColor="#9CA3AF"
            value={form.username}
            onChangeText={update('username')}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <Text style={styles.hint}>Letters, numbers, and underscores only</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="john@email.com"
            placeholderTextColor="#9CA3AF"
            value={form.email}
            onChangeText={update('email')}
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
            placeholder="Min. 8 characters"
            placeholderTextColor="#9CA3AF"
            value={form.password}
            onChangeText={update('password')}
            secureTextEntry
            textContentType="newPassword"
          />
        </View>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>Log in</Text>
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
  back: { marginBottom: 24, width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#1A1A2E', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', fontFamily: 'Inter_400Regular', marginBottom: 28 },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 14, fontFamily: 'Inter_400Regular' },

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
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4, fontFamily: 'Inter_400Regular' },

  button: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  link: { fontSize: 14, color: PRIMARY, fontFamily: 'Inter_600SemiBold' },
});
