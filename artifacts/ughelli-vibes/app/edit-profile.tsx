import React, { useMemo, useState } from 'react';
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
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/utils/api';

const COOLDOWN_DAYS = 14;

function daysRemaining(profileUpdatedAt: string | null): number {
  if (!profileUpdatedAt) return 0;
  const nextAllowed = new Date(profileUpdatedAt);
  nextAllowed.setDate(nextAllowed.getDate() + COOLDOWN_DAYS);
  const ms = nextAllowed.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 40 : insets.bottom + 24;

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const remaining = useMemo(() => daysRemaining(user?.profileUpdatedAt ?? null), [user?.profileUpdatedAt]);
  const inCooldown = remaining > 0;

  const nameChanged = name.trim() !== (user?.name ?? '');
  const usernameChanged = username.trim().toLowerCase() !== (user?.username ?? '');
  const hasChanges = nameChanged || usernameChanged;

  async function handleSave() {
    if (!hasChanges) {
      setError('Change your name or username to save.');
      return;
    }
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    if (!username.trim()) {
      setError('Username cannot be empty.');
      return;
    }
    if (!password) {
      setError('Enter your password to confirm this change.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await updateProfile({
        ...(nameChanged ? { name: name.trim() } : {}),
        ...(usernameChanged ? { username: username.trim().toLowerCase() } : {}),
        password,
      });
      setSuccess(true);
      setPassword('');
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Navbar */}
        <View
          style={[
            styles.navbar,
            { paddingTop: topInset + 6, backgroundColor: colors.background, borderBottomColor: colors.primary },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityLabel="Go back" accessibilityRole="button">
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Edit Profile</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled">
          {success ? (
            <View style={styles.successWrap}>
              <View style={[styles.successCircle, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Profile updated</Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                You can change your name or username again in {COOLDOWN_DAYS} days.
              </Text>
              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.back()}
              >
                <Text style={styles.saveBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {inCooldown ? (
                <View style={[styles.cooldownBox, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
                  <Feather name="clock" size={16} color={colors.primary} />
                  <Text style={[styles.cooldownText, { color: colors.foreground }]}>
                    You recently changed your profile. You can change your name or username again in{' '}
                    <Text style={{ fontFamily: 'Inter_600SemiBold' }}>
                      {remaining} day{remaining === 1 ? '' : 's'}
                    </Text>
                    .
                  </Text>
                </View>
              ) : (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Changing your name or username requires your password, and can only be done once every{' '}
                  {COOLDOWN_DAYS} days.
                </Text>
              )}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!inCooldown && !loading}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Username</Text>
                <View
                  style={[
                    styles.usernameRow,
                    { backgroundColor: colors.input, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.usernamePrefix, { color: colors.mutedForeground }]}>@</Text>
                  <TextInput
                    style={[styles.usernameInput, { color: colors.foreground }]}
                    value={username}
                    onChangeText={(t) => setUsername(t.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="username"
                    placeholderTextColor={colors.mutedForeground}
                    editable={!inCooldown && !loading}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Confirm password</Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your current password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  editable={!inCooldown && !loading}
                  textContentType="password"
                />
                <Text style={[styles.passwordHint, { color: colors.mutedForeground }]}>
                  Required to confirm changes to your name or username.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.saveBtn,
                  { backgroundColor: colors.primary },
                  (inCooldown || loading) && styles.saveBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={inCooldown || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 2,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19, marginBottom: 20 },
  cooldownBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20,
  },
  cooldownText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 14, fontFamily: 'Inter_400Regular' },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontFamily: 'Inter_400Regular', borderWidth: 1,
  },
  usernameRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16,
  },
  usernamePrefix: { fontSize: 16, fontFamily: 'Inter_500Medium', marginRight: 2 },
  usernameInput: { flex: 1, fontSize: 16, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  passwordHint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 6 },
  divider: { height: 1, marginVertical: 6, marginBottom: 18 },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  successWrap: { alignItems: 'center', paddingTop: 60 },
  successCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 19, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  successBody: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 20 },
});
