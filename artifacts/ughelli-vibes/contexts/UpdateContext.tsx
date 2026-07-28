/**
 * UpdateContext
 * -------------
 * Checks the public GitHub-hosted update.json on app startup and exposes the
 * result to any screen. The update screen reads this context instead of running
 * its own fetch, so there is only one check on startup.
 *
 * versionCode (integer) is the single source of truth. Changing apkUrl alone
 * never triggers an update.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as Application from 'expo-application';
import { UPDATE_JSON_URL } from '@/constants/updateConfig';

export interface UpdateInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  mandatory: boolean;
  releaseNotes?: string;
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'update-available'
  | 'error';

interface UpdateContextValue {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  /** The versionCode read from the installed APK (Android nativeBuildVersion). */
  installedVersionCode: number;
  /** The human-readable version string (e.g. "1.0.0"). */
  installedVersionName: string;
  error: string | null;
  /** Re-run the remote check at any time (e.g. from the update screen). */
  checkForUpdates: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  // Read version info from the installed APK — never from a manually stored value.
  const installedVersionName = Application.nativeApplicationVersion ?? '1.0.0';
  // nativeBuildVersion == versionCode on Android (a numeric string like "1").
  const installedVersionCode = parseInt(Application.nativeBuildVersion ?? '1', 10);

  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    setStatus('checking');
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(UPDATE_JSON_URL, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`Update server returned ${res.status}`);

      const info = await res.json() as Partial<UpdateInfo>;

      // Validate required fields
      if (typeof info.versionCode !== 'number') {
        throw new Error('Invalid update.json: versionCode must be a number');
      }
      if (!info.apkUrl) {
        throw new Error('Invalid update.json: apkUrl is missing');
      }

      const full: UpdateInfo = {
        versionCode: info.versionCode,
        versionName: info.versionName ?? String(info.versionCode),
        apkUrl: info.apkUrl,
        mandatory: info.mandatory ?? false,
        releaseNotes: info.releaseNotes,
      };

      // versionCode is the ONLY trigger — never update just because apkUrl changed
      if (full.versionCode > installedVersionCode) {
        setUpdateInfo(full);
        setStatus('update-available');
      } else {
        setUpdateInfo(null);
        setStatus('up-to-date');
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not reach the update server.';
      setError(msg);
      setStatus('error');
    }
  }, [installedVersionCode]);

  // Auto-check on every app launch
  useEffect(() => {
    checkForUpdates();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UpdateContext.Provider
      value={{
        status,
        updateInfo,
        installedVersionCode,
        installedVersionName,
        error,
        checkForUpdates,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdate must be used inside <UpdateProvider>');
  return ctx;
}
