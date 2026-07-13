import React, { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CATEGORIES, type PostCategory } from '@/constants/mockData';
import { useCreatePost } from '@/hooks/usePosts';
import { apiRequest, ApiError, getApiBase } from '@/utils/api';

interface PostType {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  hint: string;
}

const POST_TYPES: PostType[] = [
  { id: 'update', label: 'Update', icon: 'edit-3', color: '#1D4ED8', bg: '#EFF6FF', hint: 'Share a news update or community info' },
  { id: 'incident', label: 'Incident', icon: 'alert-triangle', color: '#DC2626', bg: '#FEF2F2', hint: 'Report an emergency or incident' },
  { id: 'job', label: 'Job Post', icon: 'briefcase', color: '#6D28D9', bg: '#F5F3FF', hint: 'Post a job opportunity' },
  { id: 'event', label: 'Event', icon: 'calendar', color: '#C2410C', bg: '#FFF7ED', hint: 'Create a local event listing' },
  { id: 'business', label: 'Business', icon: 'trending-up', color: '#0F766E', bg: '#F0FDFA', hint: 'Promote your business or service' },
  { id: 'traffic', label: 'Traffic', icon: 'map', color: '#B45309', bg: '#FFFBEB', hint: 'Report a road or traffic situation' },
];

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const createPost = useCreatePost();
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [published, setPublished] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  function selectType(t: PostType) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(t);
    setTitle('');
    setBody('');
    setCategory(null);
    setPublished(false);
    setErrorMessage(null);
    setImageUri(null);
  }

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library access is needed to attach a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });

    if (!result.canceled && result.assets[0]) {
      setErrorMessage(null);
      setImageUri(result.assets[0].uri);
    }
  }

  /**
   * Uploads the picked image directly to the presigned object storage URL and
   * returns the server-relative path (`/api/storage/objects/...`) to store on
   * the post. Returns undefined if there is no image to upload.
   */
  async function uploadSelectedImage(): Promise<string | undefined> {
    if (!imageUri) return undefined;

    setIsUploadingImage(true);
    try {
      const fileResponse = await fetch(imageUri);
      const blob = await fileResponse.blob();
      const contentType = blob.type || 'image/jpeg';

      const { uploadURL, objectPath } = await apiRequest<{
        uploadURL: string;
        objectPath: string;
      }>('/storage/uploads/request-url', {
        method: 'POST',
        token,
        body: { name: `post-image-${Date.now()}`, size: blob.size, contentType },
      });

      const putResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!putResponse.ok) {
        throw new Error('Upload failed');
      }

      // objectPath is like "/objects/uploads/<id>" — serve it from our own
      // API so the mobile client never talks to the bucket directly.
      return `${getApiBase()}/storage${objectPath}`;
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handlePublish() {
    if (!title.trim() || !selectedType) return;
    setErrorMessage(null);

    try {
      const imageUrl = await uploadSelectedImage();
      await createPost.mutateAsync({
        type: selectedType.id,
        category: category ?? undefined,
        headline: title.trim(),
        body: body.trim() || undefined,
        imageUrl,
        isEmergency: selectedType.id === 'incident',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPublished(true);
      setTimeout(() => {
        setSelectedType(null);
        setTitle('');
        setBody('');
        setCategory(null);
        setPublished(false);
        setImageUri(null);
        router.push('/(tabs)');
      }, 1600);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not publish your post. Please try again.'
      );
    }
  }

  const canPublish = title.trim().length > 0 && !createPost.isPending && !isUploadingImage;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: topInset + 16, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Page header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.title, { color: colors.foreground }]}>Create</Text>
            {selectedType && (
              <Pressable onPress={() => setSelectedType(null)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {!selectedType ? (
            /* Type selector grid */
            <>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                What would you like to share with Ughelli?
              </Text>
              <View style={styles.typeGrid}>
                {POST_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, { backgroundColor: t.bg, borderColor: t.color + '30' }]}
                    onPress={() => selectType(t)}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: t.color }]}>
                      <Feather name={t.icon as any} size={22} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.typeLabel, { color: t.color }]}>{t.label}</Text>
                    <Text style={[styles.typeHint, { color: t.color + 'AA' }]}>{t.hint}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : published ? (
            /* Success state */
            <View style={styles.successWrap}>
              <View style={[styles.successCircle, { backgroundColor: colors.accent }]}>
                <Feather name="check" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Published!</Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                Your update is now live on Ughelli Vibes.
              </Text>
            </View>
          ) : (
            /* Form */
            <>
              {/* Selected type pill */}
              <View style={[styles.selectedPill, { backgroundColor: selectedType.bg }]}>
                <View style={[styles.selectedPillIcon, { backgroundColor: selectedType.color }]}>
                  <Feather name={selectedType.icon as any} size={14} color="#FFFFFF" />
                </View>
                <Text style={[styles.selectedPillLabel, { color: selectedType.color }]}>
                  {selectedType.label}
                </Text>
              </View>

              {/* Headline */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>Headline *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Write a clear, concise headline..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.headlineInput,
                    { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
                  ]}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{title.length}/200</Text>
              </View>

              {/* Body */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>Details</Text>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder="Add more context or details (optional)..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.bodyInput,
                    { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
                  ]}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
              </View>

              {/* Attach photo */}
              {imageUri ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                  <Pressable
                    style={[styles.removeImageBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                    onPress={() => setImageUri(null)}
                    hitSlop={8}
                  >
                    <Feather name="x" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[styles.attachRow, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  onPress={handlePickImage}
                >
                  <Feather name="image" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.attachText, { color: colors.mutedForeground }]}>
                    Add a photo
                  </Text>
                </Pressable>
              )}

              {/* Category */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {ALL_CATEGORIES.map((cat) => {
                    const active = category === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => setCategory(cat)}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: active ? colors.primary : colors.muted,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text style={[styles.catChipText, { color: active ? '#FFFFFF' : colors.mutedForeground }]}>
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Error message */}
              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Feather name="alert-circle" size={14} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Publish button */}
              <TouchableOpacity
                onPress={handlePublish}
                disabled={!canPublish}
                style={[
                  styles.publishBtn,
                  { backgroundColor: canPublish ? colors.primary : colors.muted },
                ]}
              >
                <Feather name="send" size={17} color={canPublish ? '#FFFFFF' : colors.mutedForeground} />
                <Text style={[styles.publishText, { color: canPublish ? '#FFFFFF' : colors.mutedForeground }]}>
                  {isUploadingImage ? 'Uploading photo…' : createPost.isPending ? 'Publishing…' : 'Publish to Ughelli Vibes'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { paddingHorizontal: 16 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 24,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeCard: {
    width: '47%',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 10,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  typeHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedPillIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPillLabel: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  headlineInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    minHeight: 80,
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'right',
    marginTop: 4,
  },
  bodyInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    minHeight: 110,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  attachText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  imagePreviewWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  publishText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  successWrap: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  successBody: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#DC2626',
  },
});
