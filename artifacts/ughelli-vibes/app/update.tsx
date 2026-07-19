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
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getApiBase } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VersionInfo {
  version: string;
  versionCode: number;
  /** Relative path served by the API, e.g. "download/ughelli-vibes-latest.apk" */
  apkUrl: string;
  changelog: string;
  releaseDate: string;
}

type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date'; current: string }
  | { kind: 'update-available'; info: VersionInfo; current: string }
  | { kind: 'downloading'; info: VersionInfo; progress: number; receivedBytes: number; totalBytes: number }
  | { kind: 'installing' }
  | { kind: 'error'; message: string; canRetry: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns > 0 if b is newer than a, 0 if equal, < 0 if a is newer. */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

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
  const [state, setState] = useState<UpdateState>({ kind: 'idle' });
  const [trackWidth, setTrackWidth] = useState(0);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const installedVersion =
    Application.nativeApplicationVersion ?? '1.0.0';

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 40 : insets.bottom + 32;

  // ── Check ────────────────────────────────────────────────────────────────

  const checkForUpdates = useCallback(async () => {
    setState({ kind: 'checking' });
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/version`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const info: VersionInfo = await res.json();

      if (compareSemver(installedVersion, info.version) > 0) {
        setState({ kind: 'update-available', info, current: installedVersion });
      } else {
        setState({ kind: 'up-to-date', current: installedVersion });
      }
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not reach the update server.',
        canRetry: true,
      });
    }
  }, [installedVersion]);

  // ── Download & Install ────────────────────────────────────────────────────

  async function downloadAndInstall(info: VersionInfo) {
    if (Platform.OS !== 'android') return;

    // Build the full APK URL from the relative path in version.json
    const apiBase = getApiBase(); // https://domain/api
    const serverRoot = apiBase.replace(/\/api$/, ''); // https://domain
    const apkUrl = info.apkUrl.startsWith('http')
      ? info.apkUrl
      : `${apiBase}/${info.apkUrl}`; // e.g. https://domain/api/download/latest.apk

    const localUri = `${FileSystem.cacheDirectory}ughelli-vibes-update.apk`;

    // Remove stale file
    try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch {}

    setState({ kind: 'downloading', info, progress: 0, receivedBytes: 0, totalBytes: 0 });

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
          setState({
            kind: 'downloading',
            info,
            progress,
            receivedBytes: totalBytesWritten,
            totalBytes: totalBytesExpectedToWrite,
          });
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result?.uri) throw new Error('Download produced no file.');

      setState({ kind: 'installing' });

      // getContentUriAsync gives a content:// URI required by Android 7+
      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/vnd.android.package-archive',
      });

      // Installer is now running; go back to update-available so the user
      // can re-open the installer if they cancelled it.
      setState({ kind: 'update-available', info, current: installedVersion });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Download or installation failed.',
        canRetry: true,
      });
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderContent() {
    switch (state.kind) {
      case 'idle':
        return (
          <View style={styles.centreBlock}>
            <View style={[styles.bigIcon, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="download-cloud" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.bigTitle, { color: colors.foreground }]}>
              Check for Updates
            </Text>
            <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
              Currently installed: {installedVersion}
            </Text>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={checkForUpdates}
            >
              <Feather name="refresh-cw" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Check for Updates</Text>
            </Pressable>
          </View>
        );

      case 'checking':
        return (
          <View style={styles.centreBlock}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>
              Checking for updates…
            </Text>
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
              Ughelli Vibes TV {state.current}
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
        const { info, current } = state;
        const isAndroid = Platform.OS === 'android';
        return (
          <View style={styles.updateBlock}>
            {/* Badge */}
            <View style={[styles.newBadge, { backgroundColor: colors.primary }]}>
              <Feather name="zap" size={13} color="#FFFFFF" />
              <Text style={styles.newBadgeText}>New version available</Text>
            </View>

            {/* Version numbers */}
            <View style={[styles.versionRow, { borderColor: colors.border }]}>
              <View style={styles.versionCol}>
                <Text style={[styles.versionLabel, { color: colors.mutedForeground }]}>Installed</Text>
                <Text style={[styles.versionNum, { color: colors.foreground }]}>{current}</Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
              <View style={styles.versionCol}>
                <Text style={[styles.versionLabel, { color: colors.mutedForeground }]}>Latest</Text>
                <Text style={[styles.versionNum, { color: colors.primary }]}>{info.version}</Text>
              </View>
            </View>

            {/* Changelog */}
            {info.changelog ? (
              <View style={[styles.changelogCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.changelogTitle, { color: colors.foreground }]}>
                  What's new
                </Text>
                <Text style={[styles.changelogBody, { color: colors.mutedForeground }]}>
                  {info.changelog}
                </Text>
              </View>
            ) : null}

            {/* Release date */}
            {info.releaseDate ? (
              <Text style={[styles.releaseMeta, { color: colors.mutedForeground }]}>
                Released {info.releaseDate}
              </Text>
            ) : null}

            {/* CTA */}
            {isAndroid ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => downloadAndInstall(info)}
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

      case 'downloading': {
        const { info, progress, receivedBytes, totalBytes } = state;
        const pct = Math.round(progress * 100);
        return (
          <View style={styles.centreBlock}>
            <View style={[styles.bigIcon, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="download-cloud" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.bigTitle, { color: colors.foreground }]}>
              Downloading update…
            </Text>
            <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
              {info.version}
              {totalBytes > 0 ? `  ·  ${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)}` : ''}
            </Text>

            {/* Progress bar */}
            <View
              style={[styles.progressTrack, { backgroundColor: colors.muted }]}
              onLayout={onTrackLayout}
            >
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: Math.round(trackWidth * progress) },
                ]}
              />
            </View>
            <Text style={[styles.pctLabel, { color: colors.primary }]}>{pct}%</Text>
          </View>
        );
      }

      case 'installing':
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

      case 'error':
        return (
          <View style={styles.centreBlock}>
            <View style={[styles.bigIcon, { backgroundColor: '#FEF2F2' }]}>
              <Feather name="alert-circle" size={48} color="#DC2626" />
            </View>
            <Text style={[styles.bigTitle, { color: colors.foreground }]}>
              Something went wrong
            </Text>
            <Text style={[styles.bigSub, { color: colors.mutedForeground }]}>
              {state.message}
            </Text>
            {state.canRetry && (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={checkForUpdates}
              >
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Try again</Text>
              </Pressable>
            )}
          </View>
        );
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View
        style={[
          styles.navbar,
          {
            paddingTop: topInset + 6,
            backgroundColor: colors.background,
            borderBottomColor: colors.primary,
          },
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

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}

        {/* Always show current version at bottom */}
        {state.kind !== 'checking' && state.kind !== 'idle' && (
          <Text style={[styles.footerVersion, { color: colors.mutedForeground }]}>
            Ughelli Vibes TV · installed {installedVersion}
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  scrollContent: {
    padding: 24,
    alignItems: 'stretch',
    flexGrow: 1,
  },

  // ── Centred layout (checking / up-to-date / downloading / error)
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
  bigTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  bigSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  statusLabel: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
  },

  // ── Progress bar
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  pctLabel: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },

  // ── Update available layout
  updateBlock: {
    gap: 20,
    paddingTop: 12,
  },
  newBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  versionCol: { alignItems: 'center', gap: 4 },
  versionLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.6 },
  versionNum: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  changelogCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  changelogTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  changelogBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  releaseMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  platformNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
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
    borderRadius: 14,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
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
