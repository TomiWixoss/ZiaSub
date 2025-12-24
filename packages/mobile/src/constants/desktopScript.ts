// Desktop YouTube injected script
// Separated for better maintainability

export const INJECTED_JAVASCRIPT_DESKTOP = `
  (function() {
    // Inject responsive CSS for desktop YouTube on mobile webview
    function injectResponsiveCSS() {
      if (document.getElementById('ziasub-responsive-css')) return;
      const style = document.createElement('style');
      style.id = 'ziasub-responsive-css';
      style.textContent = \`
        /* Force responsive layout for desktop YouTube on mobile */
        /* Global overflow fix */
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          width: 100vw !important;
        }
        
        /* Guide menu - make it overlay instead of pushing content */
        #guide, ytd-mini-guide-renderer, tp-yt-app-drawer {
          position: fixed !important;
          z-index: 9999 !important;
        }
        
        /* Main app container */
        ytd-app {
          margin-left: 0 !important;
          width: 100vw !important;
          max-width: 100vw !important;
        }
        
        #page-manager {
          margin-left: 0 !important;
          padding-left: 0 !important;
          width: 100% !important;
        }
        
        /* Watch page layout */
        ytd-watch-flexy {
          flex-direction: column !important;
          width: 100% !important;
          min-width: 0 !important;
          padding: 0 !important;
          max-width: 100vw !important;
        }
        
        ytd-watch-flexy[theater], ytd-watch-flexy[fullscreen] {
          max-width: 100vw !important;
        }
        
        ytd-watch-flexy #columns {
          flex-direction: column !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
        }
        
        ytd-watch-flexy #primary {
          width: 100% !important;
          min-width: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          max-width: 100vw !important;
        }
        
        ytd-watch-flexy #primary-inner {
          width: 100% !important;
          min-width: 0 !important;
          padding: 0 !important;
          max-width: 100vw !important;
        }
        
        ytd-watch-flexy #secondary {
          width: 100% !important;
          min-width: 0 !important;
          padding: 8px !important;
          margin: 0 !important;
          max-width: 100vw !important;
        }
        
        /* Video player */
        #player-container-outer, 
        #player-container-inner, 
        #player-container,
        #player-wide-container,
        #full-bleed-container {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        #movie_player, .html5-video-player {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
        }
        
        video.html5-main-video {
          width: 100% !important;
          min-width: 0 !important;
          left: 0 !important;
          max-width: 100vw !important;
        }
        
        /* Video info below player */
        #above-the-fold, #below {
          width: 100% !important;
          min-width: 0 !important;
          padding: 8px 12px !important;
          max-width: 100vw !important;
          box-sizing: border-box !important;
        }
        
        /* Title */
        h1.ytd-watch-metadata, 
        #title h1,
        ytd-watch-metadata h1,
        yt-formatted-string.ytd-watch-metadata {
          font-size: 15px !important;
          line-height: 1.3 !important;
          word-break: break-word !important;
        }
        
        /* Channel and actions row */
        #top-row.ytd-watch-metadata {
          flex-wrap: wrap !important;
          gap: 8px !important;
        }
        
        #owner {
          width: 100% !important;
          min-width: 0 !important;
        }
        
        /* Action buttons - wrap on multiple lines */
        ytd-watch-metadata #actions {
          width: 100% !important;
          flex-wrap: wrap !important;
          gap: 4px !important;
          justify-content: flex-start !important;
        }
        
        /* Description */
        #description.ytd-watch-metadata,
        ytd-text-inline-expander {
          width: 100% !important;
          min-width: 0 !important;
          font-size: 13px !important;
          max-width: 100vw !important;
        }
        
        /* Comments */
        ytd-comments#comments {
          width: 100% !important;
          min-width: 0 !important;
          padding: 0 8px !important;
          max-width: 100vw !important;
        }
        
        /* Related videos sidebar */
        ytd-watch-next-secondary-results-renderer {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
        }
        
        ytd-compact-video-renderer {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
        }
        
        /* Header */
        #masthead-container, ytd-masthead {
          width: 100vw !important;
          min-width: 0 !important;
          max-width: 100vw !important;
        }
        
        #container.ytd-masthead {
          padding: 0 8px !important;
          max-width: 100vw !important;
          box-sizing: border-box !important;
        }
        
        ytd-masthead #end {
          flex-shrink: 1 !important;
          min-width: 0 !important;
        }
        
        /* Search */
        #center.ytd-masthead {
          flex: 1 !important;
          min-width: 0 !important;
          max-width: 50% !important;
        }
        
        /* Homepage - center content */
        ytd-browse[page-subtype="home"] {
          width: 100% !important;
          max-width: 100vw !important;
        }
        
        ytd-browse[page-subtype="home"] #contents.ytd-rich-grid-renderer {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          max-width: 100vw !important;
        }
        
        ytd-rich-grid-renderer {
          --ytd-rich-grid-items-per-row: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
          padding: 12px !important;
          max-width: 100vw !important;
          margin: 0 auto !important;
          box-sizing: border-box !important;
        }
        
        ytd-rich-grid-renderer #contents {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
        }
        
        ytd-rich-item-renderer {
          width: 100% !important;
          max-width: 100vw !important;
          min-width: 0 !important;
          margin: 0 auto 16px auto !important;
        }
        
        ytd-rich-grid-row {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
          display: flex !important;
          justify-content: center !important;
        }
        
        ytd-rich-grid-row #contents {
          width: 100% !important;
          justify-content: center !important;
        }
        
        /* Shorts shelf horizontal scroll */
        ytd-rich-shelf-renderer[is-shorts] {
          width: 100% !important;
          overflow-x: auto !important;
          max-width: 100vw !important;
        }
        
        /* Search results */
        ytd-search ytd-two-column-search-results-renderer {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100vw !important;
        }
        
        ytd-search #contents {
          width: 100% !important;
          min-width: 0 !important;
          padding: 0 8px !important;
          max-width: 100vw !important;
          box-sizing: border-box !important;
        }
        
        /* Fix two column layout */
        ytd-two-column-browse-results-renderer {
          width: 100% !important;
          max-width: 100vw !important;
        }
        
        ytd-two-column-browse-results-renderer #primary {
          width: 100% !important;
          max-width: 100vw !important;
          margin: 0 auto !important;
        }
      \`;
      document.head.appendChild(style);
    }
    
    // Inject CSS immediately and on DOM ready
    injectResponsiveCSS();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectResponsiveCSS);
    }

    let subtitleLayer = null;
    let cachedVideo = null;
    let lastTime = -1;
    let lastSubtitle = '';
    let rafId = null;
    let parentCheckId = null;
    let isPolling = false;
    let isPortrait = window.innerHeight > window.innerWidth;
    
    // Subtitle style settings (same as mobile)
    let subtitleFontSize = 15;
    let subtitleFontWeight = 'bold';
    let subtitleFontStyle = 'normal';
    let portraitBottom = 100;
    let landscapeBottom = 8;

    const throttle = (fn, delay) => {
      let last = 0;
      return (...args) => {
        const now = Date.now();
        if (now - last >= delay) {
          last = now;
          fn(...args);
        }
      };
    };

    function initSubtitleLayer() {
      if (subtitleLayer) return subtitleLayer;
      subtitleLayer = document.getElementById('custom-subtitle-layer');
      if (!subtitleLayer) {
        subtitleLayer = document.createElement('div');
        subtitleLayer.id = 'custom-subtitle-layer';
        updateSubtitleStyle();
        document.body.appendChild(subtitleLayer);
      }
      return subtitleLayer;
    }
    
    function updateSubtitleStyle() {
      if (!subtitleLayer) return;
      const weight = subtitleFontWeight === 'bold' ? '600' : '400';
      const textStroke = '-webkit-text-stroke:0.8px #000;paint-order:stroke fill;';
      const textShadow = 'text-shadow:0 0 2px #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 -1px 0 #000,0 1px 0 #000,-1px 0 0 #000,1px 0 0 #000;';
      
      // Same logic as mobile: background in portrait, no background in landscape/fullscreen
      const bgStyle = isPortrait 
        ? 'background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;' 
        : '';
      
      const bottomPos = isPortrait ? portraitBottom : landscapeBottom;
      
      // Use fixed position in portrait mode to prevent scrolling with page
      // Use absolute position in fullscreen mode (attached to fullscreen element)
      const positionType = isPortrait ? 'fixed' : 'absolute';
      subtitleLayer.style.cssText = 'position:' + positionType + ';bottom:' + bottomPos + 'px;left:5%;right:5%;max-width:90%;margin:0 auto;text-align:center;color:#FFF;font-size:' + subtitleFontSize + 'px;font-weight:' + weight + ';font-style:' + subtitleFontStyle + ';font-family:system-ui,sans-serif;' + textStroke + textShadow + bgStyle + 'pointer-events:none;z-index:2147483647;display:' + (lastSubtitle ? 'block' : 'none') + ';line-height:1.5;white-space:pre-line;transform:translateZ(0);backface-visibility:hidden;contain:layout style paint';
    }

    function ensureSubtitleInFullscreen() {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const layer = initSubtitleLayer();
      const target = fs || document.body;
      if (layer.parentElement !== target) {
        target.appendChild(layer);
        updateSubtitleStyle();
        // Restore subtitle text
        if (lastSubtitle) {
          layer.textContent = lastSubtitle;
          layer.style.display = 'block';
        }
      }
    }

    function getVideo() {
      // Desktop YouTube uses video.html5-main-video
      const currentVideo = document.querySelector('video.html5-main-video') || document.querySelector('video');
      // If video element changed (quality change, etc.), reset lastTime to force resync
      if (currentVideo && cachedVideo !== currentVideo) {
        cachedVideo = currentVideo;
        lastTime = -1; // Force resync subtitle
        lastDurationSent = 0; // Force resend duration
        // Re-attach subtitle layer when video changes (quality change in fullscreen)
        ensureSubtitleInFullscreen();
      }
      return cachedVideo;
    }

    let lastDurationSent = 0;
    
    // Check if ad is currently playing
    function isAdPlaying() {
      const player = document.querySelector('#movie_player, .html5-video-player');
      if (player) {
        const classList = player.classList;
        if (classList.contains('ad-showing') || classList.contains('ad-interrupting') || classList.contains('ad-created')) {
          return true;
        }
      }
      // Fallback: check for ad overlay elements
      if (document.querySelector('.ytp-ad-player-overlay, .ytp-ad-skip-button-container')) {
        return true;
      }
      return false;
    }
    
    // Auto skip ads when skip button is available
    function trySkipAd() {
      // Try multiple selectors for skip button
      const selectors = [
        '.ytp-ad-skip-button-modern',
        '.ytp-ad-skip-button',
        '.ytp-skip-ad-button',
        'button.ytp-ad-skip-button-modern',
        '.ytp-ad-skip-button-container button',
        '.ytp-ad-skip-ad-slot button'
      ];
      for (const sel of selectors) {
        const btn = document.querySelector(sel);
        if (btn) {
          // Try both click methods
          btn.click();
          // Also dispatch click event in case .click() doesn't work
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        }
      }
      return false;
    }
    
    function startTimePolling() {
      if (isPolling) return;
      isPolling = true;
      
      let lastPollTime = 0;
      const POLL_INTERVAL = 200;
      
      const poll = (timestamp) => {
        if (!isPolling) return;
        
        if (timestamp - lastPollTime >= POLL_INTERVAL) {
          lastPollTime = timestamp;
          const video = getVideo();
          if (video) {
            // Check for ads and try to skip
            if (isAdPlaying()) {
              trySkipAd();
            } else {
              // Only send duration when ad is NOT playing
              if (video.duration && !isNaN(video.duration) && video.duration !== lastDurationSent) {
                lastDurationSent = video.duration;
                window.ReactNativeWebView.postMessage('{"type":"videoDuration","payload":' + video.duration + '}');
              }
            }
            
            if (!video.paused) {
              const t = video.currentTime;
              if (Math.abs(t - lastTime) > 0.2) {
                lastTime = t;
                window.ReactNativeWebView.postMessage('{"type":"currentTime","payload":' + t + '}');
              }
            }
            
            // Desktop YouTube title selectors
            const titleSelectors = [
              'h1.ytd-watch-metadata yt-formatted-string',
              'h1.title yt-formatted-string',
              '#title h1 yt-formatted-string',
              'ytd-watch-metadata h1',
              '#info-contents h1'
            ];
            for (const sel of titleSelectors) {
              const el = document.querySelector(sel);
              if (el && el.textContent) {
                const title = el.textContent.trim();
                if (title && title.length > 3 && title !== 'YouTube' && title !== window.__lastSentTitle) {
                  window.__lastSentTitle = title;
                  window.ReactNativeWebView.postMessage(JSON.stringify({type:'videoTitle',payload:title}));
                  break;
                }
              }
            }
          }
        }
        rafId = requestAnimationFrame(poll);
      };
      
      rafId = requestAnimationFrame(poll);
    }

    // Translated video IDs
    let translatedVideoIds = new Set();
    let partialVideoIds = new Set();
    let queuedVideoIds = new Set();

    function extractVideoId(href) {
      const watchMatch = href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      const shortsMatch = href.match(/\\/shorts\\/([a-zA-Z0-9_-]+)/);
      if (watchMatch) return watchMatch[1];
      if (shortsMatch) return shortsMatch[1];
      return null;
    }

    function addQueueButton(container, videoId, videoUrl, title, duration) {
      const isQueued = queuedVideoIds.has(videoId);
      const isTranslated = translatedVideoIds.has(videoId);
      
      if (isTranslated) return;
      
      const existingBtn = container.querySelector('.ziasub-queue-btn');
      if (existingBtn) return;
      
      const btn = document.createElement('div');
      btn.className = 'ziasub-queue-btn';
      btn.dataset.videoId = videoId;
      btn.textContent = isQueued ? '✓' : '+';
      btn.style.cssText = 'position:absolute !important;bottom:4px !important;left:4px !important;width:24px !important;height:24px !important;line-height:24px !important;text-align:center !important;font-size:16px !important;font-weight:bold !important;background:' + (isQueued ? 'rgba(76,175,80,0.9)' : 'rgba(0,0,0,0.7)') + ' !important;color:#fff !important;border-radius:6px !important;z-index:1 !important;cursor:pointer !important;';
      
      if (!isQueued) {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'addToQueue',
            payload: { videoId, videoUrl, title, duration }
          }));
          btn.textContent = '✓';
          btn.style.background = 'rgba(76,175,80,0.9) !important';
          queuedVideoIds.add(videoId);
          return false;
        };
      }
      
      container.appendChild(btn);
    }

    function markVideos() {
      const currentUrl = window.location.href;
      if (currentUrl.includes('/watch') || currentUrl.includes('/shorts/')) return;
      
      // Desktop YouTube thumbnail selectors
      document.querySelectorAll('a#thumbnail[href*="/watch?v="], a#thumbnail[href*="/shorts/"], ytd-thumbnail a[href*="/watch?v="]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const videoId = extractVideoId(href);
        if (!videoId) return;
        
        const isShorts = href.includes('/shorts/');
        const videoUrl = isShorts 
          ? 'https://www.youtube.com/shorts/' + videoId
          : 'https://www.youtube.com/watch?v=' + videoId;
        
        let title = 'Video YouTube';
        let duration = null;
        
        // Find parent renderer
        const parent = link.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer');
        if (parent) {
          const titleEl = parent.querySelector('#video-title');
          if (titleEl) {
            title = titleEl.textContent?.trim() || titleEl.getAttribute('title') || title;
          }
          
          // Duration from overlay
          const durationEl = parent.querySelector('ytd-thumbnail-overlay-time-status-renderer span');
          if (durationEl) {
            const durationText = durationEl.textContent?.trim() || '';
            const parts = durationText.split(':').map(p => parseInt(p, 10));
            if (parts.length === 2) duration = parts[0] * 60 + parts[1];
            else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }
        
        link.style.position = 'relative';
        
        // Badge for translated videos
        const existingBadge = link.querySelector('.ziasub-badge');
        const isFullyTranslated = translatedVideoIds.has(videoId);
        const isPartialOnly = partialVideoIds.has(videoId);
        
        if (isFullyTranslated) {
          if (!existingBadge || !existingBadge.classList.contains('ziasub-badge-full')) {
            if (existingBadge) existingBadge.remove();
            const badge = document.createElement('div');
            badge.className = 'ziasub-badge ziasub-badge-full';
            badge.textContent = '㋐';
            badge.style.cssText = 'position:absolute;top:4px;left:4px;background:rgba(155,126,217,0.9);color:#fff;font-size:12px;font-weight:bold;width:18px;height:18px;line-height:18px;text-align:center;border-radius:4px;z-index:10;pointer-events:none;';
            link.appendChild(badge);
          }
        } else if (isPartialOnly) {
          if (!existingBadge || !existingBadge.classList.contains('ziasub-badge-partial')) {
            if (existingBadge) existingBadge.remove();
            const badge = document.createElement('div');
            badge.className = 'ziasub-badge ziasub-badge-partial';
            badge.textContent = '◐';
            badge.style.cssText = 'position:absolute;top:4px;left:4px;background:rgba(255,152,0,0.9);color:#fff;font-size:12px;font-weight:bold;width:18px;height:18px;line-height:18px;text-align:center;border-radius:4px;z-index:10;pointer-events:none;';
            link.appendChild(badge);
          }
        } else if (existingBadge) {
          existingBadge.remove();
        }
        
        addQueueButton(link, videoId, videoUrl, title, duration);
      });
    }

    const handleMessage = throttle((e) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d.type === 'setSubtitle' && d.payload !== lastSubtitle) {
          lastSubtitle = d.payload;
          const layer = initSubtitleLayer();
          if (d.payload) {
            layer.textContent = d.payload;
            layer.style.display = 'block';
          } else {
            layer.style.display = 'none';
          }
        } else if (d.type === 'setSubtitleStyle') {
          subtitleFontSize = d.payload.fontSize || 15;
          subtitleFontWeight = d.payload.fontWeight || 'bold';
          subtitleFontStyle = d.payload.fontStyle || 'normal';
          portraitBottom = d.payload.portraitBottom || 100;
          landscapeBottom = d.payload.landscapeBottom || 8;
          updateSubtitleStyle();
        } else if (d.type === 'setTranslatedVideos') {
          if (Array.isArray(d.payload)) {
            translatedVideoIds = new Set(d.payload || []);
            partialVideoIds = new Set();
          } else {
            translatedVideoIds = new Set(d.payload?.full || []);
            partialVideoIds = new Set(d.payload?.partial || []);
          }
          markVideos();
        } else if (d.type === 'setQueuedVideos') {
          const newQueuedIds = new Set(d.payload || []);
          document.querySelectorAll('.ziasub-queue-btn').forEach(btn => {
            const videoId = btn.dataset.videoId;
            if (!videoId) return;
            const wasQueued = queuedVideoIds.has(videoId);
            const isNowQueued = newQueuedIds.has(videoId);
            if (wasQueued && !isNowQueued) {
              btn.textContent = '+';
              btn.style.background = 'rgba(0,0,0,0.7) !important';
            } else if (!wasQueued && isNowQueued) {
              btn.textContent = '✓';
              btn.style.background = 'rgba(76,175,80,0.9) !important';
            }
          });
          queuedVideoIds = newQueuedIds;
          markVideos();
        } else if (d.type === 'setVideoVolume') {
          const video = getVideo();
          if (video) video.volume = Math.max(0, Math.min(1, d.payload));
        }
      } catch (e) {}
    }, 16);
    
    const observer = new MutationObserver(throttle(() => markVideos(), 500));
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('message', handleMessage, { passive: true });
    window.addEventListener('message', handleMessage, { passive: true });

    let fullscreenObserver = null;

    function handleFullscreenChange() {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const layer = initSubtitleLayer();
      
      // Disconnect previous observer
      if (fullscreenObserver) {
        fullscreenObserver.disconnect();
        fullscreenObserver = null;
      }
      
      if (fs) {
        fs.appendChild(layer);
        isPortrait = false;
        updateSubtitleStyle();
        // Restore subtitle
        if (lastSubtitle) {
          layer.textContent = lastSubtitle;
          layer.style.display = 'block';
        }
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_open"}');
        
        // Observe fullscreen element for DOM changes (quality change causes DOM rebuild)
        fullscreenObserver = new MutationObserver(throttle(() => {
          ensureSubtitleInFullscreen();
        }, 100));
        fullscreenObserver.observe(fs, { childList: true, subtree: true });
      } else {
        document.body.appendChild(layer);
        isPortrait = window.innerHeight > window.innerWidth;
        updateSubtitleStyle();
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_close"}');
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange, { passive: true });
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange, { passive: true });

    function handleOrientationChange() {
      const newIsPortrait = window.innerHeight > window.innerWidth;
      if (newIsPortrait !== isPortrait) {
        isPortrait = newIsPortrait;
        updateSubtitleStyle();
      }
    }

    window.addEventListener('resize', throttle(handleOrientationChange, 100), { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true });

    // Check subtitle layer position more frequently (every 500ms)
    parentCheckId = setInterval(() => {
      ensureSubtitleInFullscreen();
    }, 500);

    window.addEventListener('beforeunload', () => {
      isPolling = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (parentCheckId) clearInterval(parentCheckId);
    }, { passive: true });

    initSubtitleLayer();
    startTimePolling();
    
    if (document.readyState === 'complete') {
      setTimeout(markVideos, 500);
    } else {
      window.addEventListener('load', () => setTimeout(markVideos, 500), { once: true });
    }
    
    // Also periodically check for new videos
    setInterval(markVideos, 2000);
  })();
  true;
`;
