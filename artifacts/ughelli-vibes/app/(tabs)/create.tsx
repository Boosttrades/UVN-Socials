import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CATEGORIES, type PostCategory } from '@/constants/mockData';
import { useCreatePost, useSearchUsers } from '@/hooks/usePosts';
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
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const MAX_IMAGES = 3;

  // ── @mention autocomplete ────────────────────────────────────────────────────
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const { data: mentionSuggestions = [] } = useSearchUsers(
    mentionQuery !== null && mentionQuery.length > 0 ? mentionQuery : ''
  );

  function handleBodyChange(text: string) {
    setBody(text);
    // Detect @word at the end of typed text (most common typing position)
    const match = text.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(username: string) {
    const newBody = body.replace(/@(\w*)$/, `@${username} `);
    setBody(newBody);
    setMentionQuery(null);
  }

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
    setImageUris([]);
    setMentionQuery(null);
  }

  async function handlePickImage() {
    if (imageUris.length >= MAX_IMAGES) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorMessage('Photo library access is needed to attach a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      // No allowsEditing / no aspect ratio — keep the full original frame
    });

    if (!result.canceled && result.assets[0]) {
      setErrorMessage(null);
      setImageUris((prev) => [...prev, result.assets[0].uri].slice(0, MAX_IMAGES));
    }
  }

  function handleRemoveImage(index: number) {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  }

  /**
   * Resizes to a feed-friendly width and re-encodes at reduced quality
   * before upload (item 2/17: "compress every image" — a user should never
   * have to download a multi-MB image just to read a post). 1080px is wide
   * enough for any phone screen the image will actually be shown at, and
   * quality 0.7 keeps typical feed photos in the ~100-300KB target range
   * mentioned in the perf guidelines instead of the multi-MB originals
   * phone cameras produce.
   */
  async function compressImage(uri: string): Promise<ImagePicker.ImagePickerAsset | { uri: string }> {
    try {
      const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1080 } }], {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return result;
    } catch {
      // If manipulation fails for any reason, fall back to the original —
      // better to upload an uncompressed image than to block posting.
      return { uri };
    }
  }

  /** Upload a single image URI and return its permanent Supabase public URL */
  async function uploadOneImage(uri: string): Promise<string> {
    const compressed = await compressImage(uri);

    // Build a Blob from the URI. Works for file://, blob://, and data: URIs.
    let blob: Blob;
    let contentType: string;
    try {
      const fileResponse = await fetch(compressed.uri);
      if (!fileResponse.ok) throw new Error(`Fetch status ${fileResponse.status}`);
      blob = await fileResponse.blob();
      contentType = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';
    } catch {
      // Fallback: decode data URI manually (expo-image-manipulator returns data URIs on web)
      if (compressed.uri.startsWith('data:')) {
        const [header, base64] = compressed.uri.split(',');
        contentType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        blob = new Blob([bytes], { type: contentType });
      } else {
        throw new Error('Could not read image. Please try a different photo.');
      }
    }

    const { uploadURL, publicUrl } = await apiRequest<{
      uploadURL: string;
      objectPath: string;
      publicUrl: string;
    }>('/storage/uploads/request-url', {
      method: 'POST',
      token,
      body: {
        name: `post-image-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        size: blob.size,
        contentType,
      },
    });

    const putResponse = await fetch(uploadURL, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });
    if (!putResponse.ok) {
      const detail = await putResponse.text().catch(() => '');
      throw new Error(`Photo upload failed (${putResponse.status})${detail ? ': ' + detail : ''}. Check your internet connection and try again.`);
    }
    return publicUrl;
  }

  /** Upload all selected images sequentially and return the URL array */
  async function uploadAllImages(): Promise<string[]> {
    if (imageUris.length === 0) return [];
    setIsUploadingImage(true);
    try {
      const urls: string[] = [];
      for (const uri of imageUris) {
        urls.push(await uploadOneImage(uri));
      }
      return urls;
    } finally {
      setIsUploadingImage(false);
    }
  }

  async function handlePublish() {
    if (!selectedType) return;
    setErrorMessage(null);

    try {
      const imageUrls = await uploadAllImages();
      await createPost.mutateAsync({
        type: selectedType.id,
        category: category ?? undefined,
        headline: title.trim(),
        body: body.trim() || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
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
        setImageUris([]);
        router.push('/(tabs)');
      }, 1600);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(
        err instanceof ApiError ? err.message : 'Could not publish your post. Please try again.'
      );
    }
  }

  const canPublish = !createPost.isPending && !isUploadingImage;

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
                <Text style={[styles.label, { color: colors.foreground }]}>Headline</Text>
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
                  onChangeText={handleBodyChange}
                  placeholder="Add more context or details… type @ to mention someone"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.bodyInput,
                    { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
                  ]}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                {/* @mention suggestions */}
                {mentionQuery !== null && mentionSuggestions.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                    style={[styles.mentionList, { backgroundColor: colors.card, borderColor: colors.border }]}
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingVertical: 6 }}
                  >
                    {mentionSuggestions.slice(0, 8).map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.mentionChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                        onPress={() => insertMention(s.username)}
                      >
                        <Text style={[styles.mentionChipHandle, { color: colors.primary }]}>@{s.username}</Text>
                        <Text style={[styles.mentionChipName, { color: colors.mutedForeground }]}>{s.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Attach photos (up to 3) */}
              {imageUris.length > 0 && (
                <View style={styles.imagePreviewRow}>
                  {imageUris.map((uri, index) => (
                    <View key={uri} style={styles.imagePreviewWrap}>
                      <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                      <Pressable
                        style={[styles.removeImageBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
                        onPress={() => handleRemoveImage(index)}
                        hitSlop={8}
                      >
                        <Feather name="x" size={14} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              {imageUris.length < MAX_IMAGES && (
                <Pressable
                  style={[styles.attachRow, { borderColor: colors.border, backgroundColor: colors.muted }]}
                  onPress={handlePickImage}
                >
                  <Feather name="image" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.attachText, { color: colors.mutedForeground }]}>
                    {imageUris.length === 0 ? 'Add a photo' : `Add another photo (${imageUris.length}/${MAX_IMAGES})`}
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
  imagePreviewRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  imagePreviewWrap: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 120,
  },
  imagePreview: {
    width: '100%',
    height: 120,
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
  mentionList: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    maxHeight: 56,
  },
  mentionChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  mentionChipHandle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  mentionChipName: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
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
