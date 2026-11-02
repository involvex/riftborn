import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

type WebSource = { uri: string };

/** Minimal WebView handle — RN WebView generics are noisy under tsc. */
type WebHandle = { injectJavaScript: (script: string) => void };

function withTouch(raw: string): string {
  try {
    const u = new URL(raw);
    if (!u.searchParams.has('touch')) u.searchParams.set('touch', '1');
    return u.toString();
  } catch {
    const join = raw.includes('?') ? '&' : '?';
    return `${raw}${join}touch=1`;
  }
}

function isBundled(): boolean {
  if (process.env.EXPO_PUBLIC_GAME_BUNDLE === '1') return true;
  const extra = Constants.expoConfig?.extra as
    { gameBundle?: boolean } | undefined;
  return !!extra?.gameBundle;
}

function resolveSource(): WebSource {
  // Offline release: game copied into android assets/www
  if (isBundled() && Platform.OS === 'android') {
    return { uri: 'file:///android_asset/www/index.html' };
  }

  const env = process.env.EXPO_PUBLIC_GAME_URL?.trim();
  if (env) return { uri: withTouch(env) };

  const extra = Constants.expoConfig?.extra as { gameUrl?: string } | undefined;
  if (extra?.gameUrl?.trim()) return { uri: withTouch(extra.gameUrl.trim()) };

  if (Platform.OS === 'android') {
    return { uri: withTouch('http://10.0.2.2:5173/') };
  }
  return { uri: withTouch('http://localhost:5173/') };
}

/**
 * Injected on hardware back: ask the Phaser shell to run C9 back policy.
 */
const INJECT_NATIVE_BACK = `
(function () {
  try {
    window.dispatchEvent(new Event('riftborn-native-back'));
  } catch (e) {}
  true;
})();
`;

/**
 * Native shell: full-screen WebView over the Phaser build.
 * Dev → LAN Vite. Release → bundled file:// assets (no server).
 * Android Back is forwarded into the game (same policy as browser popstate).
 */
export default function App() {
  const source = useMemo(() => resolveSource(), []);
  const bundled = isBundled();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webRef = useRef<WebHandle | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const web = webRef.current;
      if (!web) {
        BackHandler.exitApp();
        return true;
      }
      web.injectJavaScript(INJECT_NATIVE_BACK);
      // Consume the event; game replies via onMessage if it wants leave.
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {!ready && !error && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#c4a574" size="large" />
          <Text style={styles.hint}>
            {bundled ? 'Starting Riftborn…' : 'Loading Riftborn…'}
          </Text>
          <Text style={styles.uri}>{source.uri}</Text>
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.err}>{error}</Text>
          <Text style={styles.uri}>{source.uri}</Text>
          <Text style={styles.hint}>
            {bundled
              ? 'Rebuild with bun run mobile:build'
              : 'Run bun run mobile:dev (starts Vite + installs debug app)'}
          </Text>
        </View>
      )}
      {/* WebView prop types from react-native-webview clash with RN 0.88 + TS 6. */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <WebView
        ref={webRef as any}
        source={source}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onLoadEnd={() => setReady(true)}
        onError={(e: { nativeEvent: { description?: string } }) => {
          setError(e.nativeEvent.description || 'Could not load the game');
        }}
        onHttpError={(e: { nativeEvent: { statusCode: number } }) => {
          if (e.nativeEvent.statusCode >= 400) {
            setError(`HTTP ${e.nativeEvent.statusCode}`);
          }
        }}
        onMessage={(e: { nativeEvent: { data: string } }) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data) as {
              type?: string;
              action?: string;
            };
            if (
              msg.type === 'riftborn:backResult' &&
              msg.action === 'leave' &&
              Platform.OS === 'android'
            ) {
              BackHandler.exitApp();
            }
          } catch {
            /* ignore non-JSON */
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e1218' },
  webview: { flex: 1, backgroundColor: '#0e1218' },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0e1218',
  },
  hint: {
    marginTop: 12,
    color: '#a8b0b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  uri: {
    marginTop: 8,
    color: '#6a7888',
    fontSize: 11,
    textAlign: 'center',
  },
  err: {
    color: '#e88a7a',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
});
