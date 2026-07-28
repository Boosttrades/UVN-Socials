/**
 * Update Screen
 * -------------
 * Handles both:
 *   1. Manual check (reachable from Settings → "Check for Updates")
 *   2. Mandatory-update gate (navigated here automatically by MandatoryUpdateGate
 *      in _layout.tsx when the remote versionCode > installed versionCode AND
 *      mandatory === true).
 *
 * All remote checking is delegated to UpdateContext (which fires on startup).
 * This screen owns only the download + install state machine.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useUpdate, type UpdateInfo } from '@/contexts/UpdateContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type DownloadState =
  | { kind: 'idle' }
  | { kind: 'downloading'; progress: number; receivedBytes: number; totalBytes: number }
  | { kind: 'installing' }
  | { kind: 'download-error'; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UpdateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // All check/result state lives in the context
  const {
    status,
    updateInfo,
    installedVersionCode,
    installedVersionName,
    error: checkError,
    checkForUpdates,
  } = useUpdate();

  // Download/install state is local to this screen
  const [dl, setDl] = useState<DownloadState>({ kind: 'idle' });
  const [trackWidth, setTrackWidth] = useState(0);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const isMandatory = updateInfo?.mandatory === true;
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 40 : insets.bottom + 32;

  // ── Download & Install ──────────────────────────────────────────────────────

  async function downloadAndInstall(info: UpdateInfo) {
    if (Platform.OS !== 'android') return;

    // Build the full APK URL
    let apkUrl: string;
    try {
      if (info.apkUrl.startsWith('http://') || info.apkUrl.startsWith('https://')) {
        apkUrl = info.apkUrl;
      } else {
        throw new Error(`apkUrl must be a full https:// URL. Got: "${info.apkUrl}"`);
      }
      new URL(apkUrl); // validate
    } catch (err) {
      setDl({
        kind: 'download-error',
        message: err instanceof Error ? err.message : 'Invalid APK URL in update.json',
      });
      return;
    }

    const localUri = `${FileSystem.cacheDirectory}uvn-update.apk`;
    try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch {}

    setDl({ kind: 'downloading', progress: 0, receivedBytes: 0, totalBytes: 0 });

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        apkUrl,
        localUri,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const progress =
            totalBytesExpectedToWrite > 0
              ? totalBytesWritten / totalBytesExpectedToWrite
              : 0;
          setDl({
            kind: 'downloading',
            progress,
            receivedBytes: totalBytesWritten,
            totalBytes: totalBytesExpectedToWrite,
          });
        },
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download completed but produced no file.');

      setDl({ kind: 'installing' });

      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

      // Installer launched — reset so user can retry if they cancelled it
      setDl({ kind: 'idle' });
    } catch (err) {
      setDl({
        kind: 'download-error',
        message: err instanceof Error ? err.message : 'Download or installation failed.',
      });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderBody() {
    // Downloading / installing takes priority over context state
    if (dl.kind === 'downloading') {
      const pct = Math.round(dl.progress * 100);
      return (
        <View style={styles.centreBlock}>
          <View style={[styles.bigIcon, { backgroundColor: colors.primary + '18' }]}>
            <Feather name="download-cloud" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.foreground }]}>
            Downloading update…
          </Text>
          <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
            {updateInfo?.versionName ?? ''}
            {dl.totalBytes > 0
              ? `  ·  ${formatBytes(dl.receivedBytes)} / ${formatBytes(dl.totalBytes)}`
              : ''}
          </Text>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.muted }]}
            onLayout={onTrackLayout}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.primary, width: Math.round(trackWidth * dl.progress) },
              ]}
            />
          </View>
          <Text style={[styles.pctLabel, { color: colors.primary }]}>{pct}%</Text>
        </View>
      );
    }

    if (dl.kind === 'installing') {
      return (
        <View style={styles.centreBlock}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.bigTitle, { color: colors.foreground }]}>
            Launching installer…
          </Text>
          <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
            Follow the prompts in the Android installer to finish.
          </Text>
        </View>
      );
    }

    if (dl.kind === 'download-error') {
      return (
        <View style={styles.centreBlock}>
          <View style={[styles.bigIcon, { backgroundColor: colors.emergencyBg ?? '#FEF2F2' }]}>
            <Feather name="alert-circle" size={48} color={colors.emergency} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.foreground }]}>Download failed</Text>
          <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>{dl.message}</Text>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setDl({ kind: 'idle' })}
          >
            <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    // dl.kind === 'idle' — show context-driven state
    switch (status) {
      case 'idle':
      case 'checking':
        return (
          <View style={styles.centreBlock}>
            {status === 'checking' ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <View style={[styles.bigIcon, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="download-cloud" size={48} color={colors.primary} />
              </View>
            )}
            <Text style={[styles.bigTitle, { color: colors.foreground }]}>
              {status === 'checking' ? 'Checking for updates…' : 'Check for Updates'}
            </Text>
            <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
              Installed: v{installedVersionName} (build {installedVersionCode})
            </Text>
            {status === 'idle' && (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                onPress={checkForUpdates}
              >
                <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Check for Updates</Text>
              </Pressable>
            )}
          </View>
        );

      case 'up-to-date':
        return (
          <View style={styles.centreBlock}>
            <View style={[styles.bigIcon, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="check-circle" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.bigTitle, { color: colors.foreground }]}>
              You're on the latest version
            </Text>
            <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
              Ughelli Vibes TV v{installedVersionName}
            </Text>
            <Pressable
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={checkForUpdates}
            >
              <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
              <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>
                Check again
              </Text>
            </Pressable>
          </View>
        );

      case 'update-available': {
        if (!updateInfo) return null;
        const isAndroid = Platform.OS === 'android';
        return (
          <View style={styles.updateBlock}>
            {/* Mandatory warning */}
            {isMandatory && (
              <View style={[styles.mandatoryBanner, { backgroundColor: colors.emergency + '18', borderColor: colors.emergency + '40' }]}>
                <Feather name="alert-triangle" size={15} color={colors.emergency} />
                <Text style={[styles.mandatoryText, { color: colors.emergency }]}>
                  This update is required. You cannot use the app until it is installed.
                </Text>
              </View>
            )}

            {/* Badge */}
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Feather name="zap" size={13} color="#FFFFFF" />
              <Text style={styles.newBadgeText}>New version available</Text>
            </View>

            {/* Version numbers */}
            <View style={[styles.versionRow, { borderColor: colors.border }]}>
              <View style={styles.versionCol}>
                <Text style={[styles.versionLabel, { color: colors.mutedForeground }]}>Installed</Text>
                <Text style={[styles.versionNum, { color: colors.foreground }]}>
                  v{installedVersionName}
                </Text>
                <Text style={[styles.buildNum, { color: colors.mutedForeground }]}>
                  build {installedVersionCode}
                </Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
              <View style={styles.versionCol}>
                <Text style={[styles.versionLabel, { color: colors.mutedForeground }]}>Latest</Text>
                <Text style={[styles.versionNum, { color: colors.primary }]}>
                  v{updateInfo.versionName}
                </Text>
                <Text style={[styles.buildNum, { color: colors.mutedForeground }]}>
                  build {updateInfo.versionCode}
                </Text>
              </View>
            </View>

            {/* Release notes */}
            {updateInfo.releaseNotes ? (
              <View style={[styles.changelogCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.changelogTitle, { color: colors.foreground }]}>
                  What's new
                </Text>
                <Text style={[styles.changelogBody, { color: colors.mutedForeground }]}>
                  {updateInfo.releaseNotes}
                </Text>
              </View>
            ) : null}

            {/* CTA */}
            {isAndroid ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => downloadAndInstall(updateInfo)}
              >
                <Feather name="download" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Download &amp; Install</Text>
              </Pressable>
            ) : (
              <View style={[styles.platformNotice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="info" size={15} color={colors.mutedForeground} />
                <Text style={[styles.platformNoticeText, { color: colors.mutedForeground }]}>
                  APK updates are only available on Android devices.
                </Text>
              </View>
            )}
          </View>
        );
      }

      case 'error':
        return (
          <View style={styles.centreBlock}>
            <View style={[styles.bigIcon, { backgroundColor: colors.emergencyBg ?? '#FEF2F2' }]}>
              <Feather name="alert-circle" size={48} color={colors.emergency} />
            </View>
            <Text style={[styles.bigTitle, { color: colors.foreground }]}>
              Couldn't check for updates
            </Text>
            <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
              {checkError}
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={checkForUpdates}
            >
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Try again</Text>
            </Pressable>
          </View>
        );
    }
  }

  return (
    <View style={styles.root}>
      {/* Navbar — hidden when mandatory (no escape) */}
      {!isMandatory && (
        <View
          style={[
            styles.navbar,
            { paddingTop: topInset + 6, backgroundColor: 'transparent', borderBottomColor: colors.primary },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Check for Updates</Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {/* Mandatory header — shown instead of navbar when update is required */}
      {isMandatory && (
        <View style={[styles.mandatoryHeader, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.navTitle, { color: colors.foreground, textAlign: 'center' }]}>
            Update Required
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}

        {/* Footer version — shown when not actively downloading */}
        {dl.kind === 'idle' && status !== 'idle' && status !== 'checking' && (
          <Text style={[styles.footerVersion, { color: colors.mutedForeground }]}>
            Installed: v{installedVersionName} · build {installedVersionCode}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  mandatoryHeader: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  scrollContent: {
    padding: 24,
    alignItems: 'stretch',
    flexGrow: 1,
  },

  // ── Centred layout
  centreBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    gap: 16,
  },
  bigIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  bigTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  bigSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },

  // ── Progress bar
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  pctLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },

  // ── Update available layout
  updateBlock: { gap: 20, paddingTop: 12 },
  mandatoryBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  mandatoryText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1, lineHeight: 18 },
  newBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 28,
  },
  newBadgeText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  versionCol: { alignItems: 'center', gap: 2 },
  versionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  versionNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  buildNum: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  changelogCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  changelogTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  changelogBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  platformNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  platformNoticeText: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },

  // ── Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_700Bold' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  // ── Footer
  footerVersion: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 32,
  },
});
