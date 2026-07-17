import React, { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed, useUserProfile } from '@/hooks/usePosts';
import { apiRequest, getApiBase } from '@/utils/api';
import FeedCard from '@/components/FeedCard';

type ProfileTab = 'Updates' | 'Saved';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Convert a stored object path like /objects/xxx into a full URL */
function getStorageUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  // Already a full URL
  if (objectPath.startsWith('http')) return objectPath;
  // objectPath is like /objects/xxx — storage route is /api/storage/objects/xxx
  const base = getApiBase(); // e.g. https://domain/api
  const path = objectPath.startsWith('/objects/')
    ? objectPath.slice('/objects/'.length)
    : objectPath.replace(/^\//, '');
  return `${base}/storage/objects/${path}`;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateProfileImage } = useAuth();
  const { data: posts = [] } = useFeed();
  const { data: profile } = useUserProfile(user?.username);
  const [activeTab, setActiveTab] = useState<ProfileTab>('Updates');
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const displayName = user?.name ?? '';
  const handle = `@${user?.username ?? ''}`;
  const myPosts = user ? posts.filter((p) => p.author.id === user.id) : [];
  const savedPosts = posts.filter((p) => p.isBookmarked);
  const listData = activeTab === 'Updates' ? myPosts : savedPosts;
  const photoUrl = getStorageUrl(user?.profileImage);

  // ── Upload flow ─────────────────────────────────────────────────────────────

  async function pickAndUploadPhoto() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to set a profile picture.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,           // keep full quality; we compress below
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    try {
      // Compress to 400×400 — profile photos are displayed small; no need for more
      const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.85, format: SaveFormat.JPEG }
      );

      const contentType = 'image/jpeg';
      const { uploadURL, publicUrl } = await apiRequest<{
        uploadURL: string;
        objectPath: string;
        publicUrl: string;
      }>('/storage/uploads/request-url', {
        method: 'POST',
        token,
        body: {
          name: `profile-${user?.id}-${Date.now()}.jpg`,
          size: 0,
          contentType,
        },
      });

      const blob = await fetch(compressed.uri).then((r) => r.blob());
      const upload = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });

      if (!upload.ok) throw new Error('Upload failed');
      await updateProfileImage(publicUrl);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  }

  /** Tapping the avatar: show action sheet if photo exists, else go straight to picker */
  function handleAvatarPress() {
    if (uploading) return;
    if (!photoUrl) {
      pickAndUploadPhoto();
      return;
    }
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'View Photo', 'Change Photo'], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) setViewingPhoto(true);
          if (idx === 2) pickAndUploadPhoto();
        }
      );
    } else {
      // Android / web — use Alert as the action sheet
      Alert.alert('Profile Photo', undefined, [
        { text: 'View Photo', onPress: () => setViewingPhoto(true) },
        { text: 'Change Photo', onPress: pickAndUploadPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  // ── Avatar ──────────────────────────────────────────────────────────────────

  const Avatar = (
    <View style={styles.avatarContainer}>
      {/* Full-screen photo viewer modal */}
      <Modal
        visible={viewingPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPhoto(false)}
      >
        <Pressable
          style={styles.photoViewerBg}
          onPress={() => setViewingPhoto(false)}
        >
          <Image
            source={{ uri: photoUrl ?? '' }}
            style={styles.photoViewerImg}
            contentFit="contain"
          />
        </Pressable>
      </Modal>

      <Pressable
        onPress={handleAvatarPress}
        accessibilityLabel={photoUrl ? 'Profile photo options' : 'Add profile photo'}
        accessibilityRole="button"
        style={[styles.avatarRing, { borderColor: colors.primary }]}
      >
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatarInitials, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarInitialsText}>
              {user ? getInitials(user.name) : '?'}
            </Text>
          </View>
        )}

        {/* Camera overlay — small badge at bottom so it doesn't obscure photo */}
        <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="camera" size={18} color="#fff" />
          )}
        </View>
      </Pressable>
    </View>
  );

  // ── List header (everything above the posts) ────────────────────────────────

  const ListHeader = (
    <View style={[styles.header, { paddingTop: topInset + 16 }]}>
      {/* Settings — top right */}
      <Pressable
        style={styles.settingsBtn}
        hitSlop={8}
        onPress={() => router.push('/settings' as any)}
        accessibilityLabel="Settings"
        accessibilityRole="button"
      >
        <Feather name="settings" size={20} color={colors.foreground} />
      </Pressable>

      {/* Avatar */}
      {Avatar}

      {/* Name & handle */}
      <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
      <Text style={[styles.handle, { color: colors.mutedForeground }]}>{handle}</Text>

      {/* Stats */}
      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        {[
          { label: 'Updates', value: String(profile?.postsCount ?? myPosts.length) },
          { label: 'Followers', value: String(profile?.followersCount ?? 0) },
          { label: 'Following', value: String(profile?.followingCount ?? 0) },
        ].map((s, i) => (
          <View
            key={s.label}
            style={[
              styles.stat,
              i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
            ]}
          >
            <Text style={[styles.statVal, { color: colors.primary }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/edit-profile' as any)}
        >
          <Feather name="edit-2" size={14} color="#fff" />
          <Text style={styles.actionBtnPrimaryText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline, { borderColor: colors.border }]}
          onPress={async () => {
            try {
              await Share.share({
                message: `Check out ${displayName} (${handle}) on Ughelli Vibes — your local news network!`,
                title: `${displayName} on Ughelli Vibes`,
              });
            } catch {
              // user dismissed, ignore
            }
          }}
        >
          <Feather name="share-2" size={14} color={colors.foreground} />
          <Text style={[styles.actionBtnOutlineText, { color: colors.foreground }]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Content tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        {(['Updates', 'Saved'] as ProfileTab[]).map((tab) => {
          const active = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                { borderBottomColor: active ? colors.primary : 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? colors.primary : colors.mutedForeground,
                    fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular',
                  },
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <FlatList
      style={[styles.root, { backgroundColor: colors.background }]}
      data={listData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard post={item} />}
      ListHeaderComponent={ListHeader}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Feather
            name={activeTab === 'Saved' ? 'bookmark' : 'edit-3'}
            size={40}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {activeTab === 'Saved' ? 'No saved updates yet' : 'Nothing posted yet'}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
            {activeTab === 'Saved'
              ? 'Updates you save will appear here'
              : 'Your updates will appear here once you post'}
          </Text>
        </View>
      }
    />
  );
}

const AVATAR_SIZE = 112;

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },

  settingsBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Avatar ──────────────────────────────────────────────────────────────────
  avatarContainer: {
    marginBottom: 16,
  },
  photoViewerBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoViewerImg: {
    width: '90%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  avatarRing: {
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarInitials: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialsText: {
    color: '#fff',
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: AVATAR_SIZE * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Identity ─────────────────────────────────────────────────────────────
  name: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  handle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
    textAlign: 'center',
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionBtnPrimary: {},
  actionBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  actionBtnOutline: {
    borderWidth: 1,
  },
  actionBtnOutlineText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },

  // ── Content tabs ─────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    alignSelf: 'stretch',
    marginLeft: -20,
    marginRight: -20,
    paddingLeft: 20,
    paddingRight: 20,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14 },

  // ── Empty ────────────────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyHint: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
