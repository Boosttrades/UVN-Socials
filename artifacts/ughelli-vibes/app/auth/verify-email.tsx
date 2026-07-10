import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      {/* Icon */}
      <View style={styles.iconWrap}>
        <Feather name="mail" size={48} color="#0F8A5F" />
      </View>

      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a verification link to your email address. Click the link to activate your account,
        then come back here to log in.
      </Text>

      <View style={styles.note}>
        <Feather name="info" size={16} color="#6B7280" style={{ marginRight: 8 }} />
        <Text style={styles.noteText}>The link expires in 24 hours.</Text>
      </View>

      <Pressable style={styles.button} onPress={() => router.replace('/auth/login')}>
        <Text style={styles.buttonText}>Back to Login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 36,
  },
  noteText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular', flex: 1 },
  button: {
    backgroundColor: '#0F8A5F',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
