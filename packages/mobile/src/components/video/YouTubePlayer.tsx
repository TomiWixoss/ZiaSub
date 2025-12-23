import React, { useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import {
  WebView,
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview";
import {
  MOBILE_USER_AGENT,
  DESKTOP_USER_AGENT,
  INJECTED_JAVASCRIPT,
  INJECTED_JAVASCRIPT_DESKTOP,
} from "@constants/scripts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";

interface YouTubePlayerProps {
  onMessage: (event: WebViewMessageEvent) => void;
  onNavigationStateChange: (navState: WebViewNavigation) => void;
  onLoad?: () => void;
  isDesktopMode?: boolean;
}

const YouTubePlayer = React.forwardRef<WebView, YouTubePlayerProps>(
  (
    { onMessage, onNavigationStateChange, onLoad, isDesktopMode = false },
    ref
  ) => {
    const styles = useThemedStyles(themedStyles);

    // Memoize source based on mode
    const source = useMemo(
      () => ({
        uri: isDesktopMode
          ? "https://www.youtube.com"
          : "https://m.youtube.com",
      }),
      [isDesktopMode]
    );

    // Select user agent and script based on mode
    const userAgent = isDesktopMode ? DESKTOP_USER_AGENT : MOBILE_USER_AGENT;
    const injectedScript = isDesktopMode
      ? INJECTED_JAVASCRIPT_DESKTOP
      : INJECTED_JAVASCRIPT;

    return (
      <View style={styles.videoContainer}>
        <WebView
          ref={ref}
          source={source}
          style={styles.webview}
          userAgent={userAgent}
          injectedJavaScript={injectedScript}
          onMessage={onMessage}
          onNavigationStateChange={onNavigationStateChange}
          onLoad={onLoad}
          // Fullscreen & Media
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // Cache & Cookies
          cacheEnabled={true}
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          // Scrolling optimization
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={false}
          // Hardware acceleration - critical for performance
          androidLayerType="hardware"
          renderToHardwareTextureAndroid={true}
          // Memory optimization
          removeClippedSubviews={true}
          startInLoadingState={false}
          // Disable unnecessary features
          textZoom={100}
          scalesPageToFit={true}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          // Additional performance props
          bounces={false}
          scrollEnabled={true}
          directionalLockEnabled={true}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          // Reduce JS bridge overhead
          injectedJavaScriptBeforeContentLoaded=""
          // iOS specific optimizations
          {...(Platform.OS === "ios" && {
            allowsBackForwardNavigationGestures: false,
            allowsLinkPreview: false,
            dataDetectorTypes: "none",
          })}
          // Android specific optimizations
          {...(Platform.OS === "android" && {
            mixedContentMode: "compatibility",
            geolocationEnabled: false,
            allowFileAccess: false,
            saveFormDataDisabled: true,
          })}
        />
      </View>
    );
  }
);

const themedStyles = createThemedStyles((colors) => ({
  videoContainer: {
    flex: 1,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
}));

export default YouTubePlayer;
