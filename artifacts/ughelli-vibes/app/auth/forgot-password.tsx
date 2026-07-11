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

const PRIMARY = '#0F8A5F';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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
      // Backend always returns success for this endpoint to avoid email
      // enumeration, so a thrown error here means something else went wrong.
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#1A1A2E" />
        </Pressable>

        {sent ? (
          <View style={styles.centerContent}>
            <View style={styles.iconWrap}>
              <Feather name="mail" size={40} color={PRIMARY} />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.body}>
              If an account exists for <Text style={styles.bold}>{email.trim()}</Text>, we've sent a link
              to reset your password. The link expires in 1 hour.
            </Text>
            <Pressable style={styles.button} onPress={() => router.replace('/auth/login')}>
              <Text style={styles.buttonText}>Back to Login</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.body}>
              Enter the email you signed up with and we'll send you a link to reset your password.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="john@email.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset link</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 24 },

  form: { flex: 1, marginTop: 8 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  title: { fontSize: 24, fontFamily: 'Inter_700Bold', color: '#1A1A2E', marginBottom: 12, textAlign: 'left' },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular', color: '#6B7280', lineHeight: 22, marginBottom: 24 },
  bold: { fontFamily: 'Inter_600SemiBold', color: '#1A1A2E' },

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

  button: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
