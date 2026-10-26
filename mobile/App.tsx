import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

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

function defaultGameUrl(): string {
  const env = process.env.EXPO_PUBLIC_GAME_URL;
  if (env && env.length > 0) return withTouch(env);
  // Android emulator loopback to host machine
  if (Platform.OS === 'android') {
    return withTouch('http://10.0.2.2:5173/');
  }
  return withTouch('http://localhost:5173/');
}

/**
 * Native shell: full-screen WebView over the Phaser Vite build.
 * Touch UI lives inside Phaser (`/?touch=1`) — not React Native.
 */
export default function App() {
  const uri = useMemo(() => defaultGameUrl(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    ).catch(() => {
      /* portrait still works with on-screen stick */
    });
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {!ready && !error && (
        <View style={styles.overlay}>
          <ActivityIndicator color="#c4a574" size="large" />
          <Text style={styles.hint}>Loading Riftborn…</Text>
          <Text style={styles.uri}>{uri}</Text>
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.err}>{error}</Text>
          <Text style={styles.hint}>
            Start the game with `bun run dev`, set EXPO_PUBLIC_GAME_URL to your
            LAN IP (see `bun run mobile:lan`), then reload.
          </Text>
        </View>
      )}
      <WebView
        source={{ uri }}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onLoadEnd={() => setReady(true)}
        onError={(e) => {
          setError(e.nativeEvent.description || 'Could not reach the game URL');
        }}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 400) {
            setError(`HTTP ${e.nativeEvent.statusCode} loading game`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0e1218',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0e1218',
  },
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
