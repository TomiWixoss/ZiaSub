import React, { useMemo } from "react";
import { StyleSheet, View, Platform } from "react-native";
import {
  WebView,
  WebViewMessageEvent,
  WebViewNavigation,
} from "react-native-webview";
import { CUSTOM_USER_AGENT, INJECTED_JAVASCRIPT } from "@constants/scripts";

import { COLORS } from "@constants/colors";

interface YouTubePlayerProps {
  onMessage: (event: WebViewMessageEvent) => void;
  onNavigationStateChange: (navState: WebViewNavigation) => void;
}

const YouTubePlayer = React.forwardRef<WebView, YouTubePlayerProps>(
  ({ onMessage, onNavigationStateChange }, ref) => {
    // Memoize source to prevent re-renders
    const source = useMemo(() => ({ uri: "https://m.youtube.com" }), []);

    return (
      <View style={styles.videoContainer}>
        <WebView
          ref={ref}
          source={source}
          style={styles.webview}
          userAgent={CUSTOM_USER_AGENT}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          onMessage={onMessage}
          onNavigationStateChange={onNavigationStateChange}
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

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

export default YouTubePlayer;
