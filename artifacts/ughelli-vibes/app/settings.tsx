import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  danger?: boolean;
  tintColor?: string;
}

function SettingRow({ icon, label, value, toggle, toggleValue, onToggle, onPress, danger, tintColor }: SettingRowProps) {
  const colors = useColors();
  const iconColor = danger ? colors.emergency : (tintColor ?? colors.primary);

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={toggle ? 1 : 0.7}
      disabled={toggle && !onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Feather name={icon as any} size={17} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? colors.emergency : colors.foreground }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      ) : value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : (
        <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground, backgroundColor: colors.muted }]}>
      {title.toUpperCase()}
    </Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 40 : insets.bottom + 24;

  const [notifBreaking, setNotifBreaking] = useState(true);
  const [notifEmergency, setNotifEmergency] = useState(true);
  const [notifJobs, setNotifJobs] = useState(false);
  const [notifEvents, setNotifEvents] = useState(false);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [notifComments, setNotifComments] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [dataLite, setDataLite] = useState(false);
  const [locationAccess, setLocationAccess] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View
        style={[
          styles.navbar,
          { paddingTop: topInset + 6, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityLabel="Go back" accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: '#066A46' }]}>
            <Text style={styles.profileAvatarText}>JO</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.profileName, { color: colors.foreground }]}>John Oghenerukewe</Text>
              <Feather name="check-circle" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.profileHandle, { color: colors.mutedForeground }]}>@john.oghenerukewe</Text>
            <Text style={[styles.profileBadge, { color: colors.primary }]}>Verified Community Reporter</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="alert-triangle" label="Emergency Alerts" toggle toggleValue={notifEmergency} onToggle={setNotifEmergency} tintColor={colors.emergency} />
          <SettingRow icon="zap" label="Breaking News" toggle toggleValue={notifBreaking} onToggle={setNotifBreaking} />
          <SettingRow icon="briefcase" label="Job Listings" toggle toggleValue={notifJobs} onToggle={setNotifJobs} />
          <SettingRow icon="calendar" label="Events Near Me" toggle toggleValue={notifEvents} onToggle={setNotifEvents} />
          <SettingRow icon="at-sign" label="Mentions" toggle toggleValue={notifMentions} onToggle={setNotifMentions} />
          <SettingRow icon="user-plus" label="New Followers" toggle toggleValue={notifFollows} onToggle={setNotifFollows} />
          <SettingRow icon="message-circle" label="Comments on My Posts" toggle toggleValue={notifComments} onToggle={setNotifComments} />
        </View>

        {/* Content */}
        <SectionHeader title="Content & Display" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="play" label="Auto-play Videos" toggle toggleValue={autoPlay} onToggle={setAutoPlay} />
          <SettingRow icon="wifi" label="Data Lite Mode" toggle toggleValue={dataLite} onToggle={setDataLite} />
          <SettingRow icon="map-pin" label="Location for Local Feed" toggle toggleValue={locationAccess} onToggle={setLocationAccess} />
          <SettingRow icon="eye-off" label="Muted Keywords" value="0 words" />
          <SettingRow icon="users" label="Blocked Accounts" value="0" />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="user" label="Edit Profile" />
          <SettingRow icon="shield" label="Privacy & Safety" />
          <SettingRow icon="lock" label="Change Password" />
          <SettingRow icon="link" label="Connected Accounts" />
        </View>

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="help-circle" label="Help Center" />
          <SettingRow icon="flag" label="Report a Problem" />
          <SettingRow icon="info" label="About Ughelli Vibes TV" />
          <SettingRow icon="star" label="Rate the App" />
        </View>

        {/* Version */}
        <View style={[styles.versionRow, { borderColor: colors.border }]}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={14} color="#FFFFFF" />
          </View>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            Ughelli Vibes TV · v1.0.0
          </Text>
        </View>

        {/* Sign out */}
        <SectionHeader title="Account Actions" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="log-out" label="Sign Out" danger />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 20, marginBottom: 4,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Inter_700Bold' },
  profileName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  profileHandle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  profileBadge: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 3 },
  sectionHeader: {
    fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8,
  },
  section: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12,
  },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  rowValue: { fontSize: 14, fontFamily: 'Inter_400Regular', marginRight: 4 },
  versionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20,
  },
  logoMark: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  versionText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
