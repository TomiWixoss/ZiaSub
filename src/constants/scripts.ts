export const CUSTOM_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";

export const INJECTED_JAVASCRIPT = `
  (function() {
    let subtitleLayer = null;
    let cachedVideo = null;
    let lastTime = -1;
    let lastSubtitle = '';
    let rafId = null;
    let parentCheckId = null;
    let isPolling = false;
    let isPortrait = window.innerHeight > window.innerWidth;
    
    // Subtitle style settings
    let subtitleFontSize = 15;
    let subtitleFontWeight = 'bold';
    let subtitleFontStyle = 'normal';
    let portraitBottom = 12;
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
      const currentVideo = document.querySelector('video');
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
            if (video.duration && !isNaN(video.duration) && video.duration !== lastDurationSent) {
              lastDurationSent = video.duration;
              window.ReactNativeWebView.postMessage('{"type":"videoDuration","payload":' + video.duration + '}');
            }
            
            if (!video.paused) {
              const t = video.currentTime;
              if (Math.abs(t - lastTime) > 0.2) {
                lastTime = t;
                window.ReactNativeWebView.postMessage('{"type":"currentTime","payload":' + t + '}');
              }
            }
            
            // Send video title - try multiple selectors for mobile YouTube
            const titleSelectors = [
              '.slim-video-information-title .yt-core-attributed-string',
              '.slim-video-information-title',
              'h1.title',
              '.ytp-title-link',
              'ytm-slim-video-information-header-renderer .title',
              '[class*="video-title"]',
              'h1'
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

    // Translated video IDs set and queued video IDs
    let translatedVideoIds = new Set();
    let queuedVideoIds = new Set();

    function extractVideoId(href) {
      const watchMatch = href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
      const shortsMatch = href.match(/\\/shorts\\/([a-zA-Z0-9_-]+)/);
      if (watchMatch) return watchMatch[1];
      if (shortsMatch) return shortsMatch[1];
      return null;
    }

    function getVideoTitle(item) {
      const titleSelectors = [
        '.YtmCompactMediaItemHeadline .yt-core-attributed-string',
        '.media-item-headline .yt-core-attributed-string',
        'h4 .yt-core-attributed-string',
        '.title',
        'h3'
      ];
      for (const sel of titleSelectors) {
        const el = item.querySelector(sel);
        if (el && el.textContent) {
          const title = el.textContent.trim();
          if (title && title.length > 3) return title;
        }
      }
      return 'Video YouTube';
    }

    function addQueueButton(container, videoId, videoUrl, title) {
      const isQueued = queuedVideoIds.has(videoId);
      const isTranslated = translatedVideoIds.has(videoId);
      
      if (isTranslated) return;
      if (container.querySelector('.ziasub-queue-btn')) return;
      
      const btn = document.createElement('div');
      btn.className = 'ziasub-queue-btn';
      btn.dataset.videoId = videoId;
      btn.textContent = isQueued ? '✓' : '+';
      btn.style.cssText = 'position:absolute !important;bottom:4px !important;left:4px !important;width:24px !important;height:24px !important;line-height:24px !important;text-align:center !important;font-size:16px !important;font-weight:bold !important;background:' + (isQueued ? 'rgba(76,175,80,0.9)' : 'rgba(0,0,0,0.7)') + ' !important;color:#fff !important;border-radius:6px !important;z-index:1 !important;cursor:pointer !important;font-family:sans-serif !important;';
      
      if (!isQueued) {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'addToQueue',
            payload: { videoId, videoUrl, title }
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
      if (currentUrl.includes('/watch') || currentUrl.includes('/shorts/')) {
        return;
      }
      
      // Find all links that contain video thumbnails
      document.querySelectorAll('a[href*="/watch?v="]').forEach(link => {
        // Skip if already processed or no thumbnail inside
        if (link.dataset.ziasubDone) return;
        
        // Check if this link contains a thumbnail image
        const hasThumb = link.querySelector('img[src*="ytimg.com"], img[src*="i.ytimg"], ytm-thumbnail-cover, ytm-compact-thumbnail');
        if (!hasThumb) return;
        
        const href = link.getAttribute('href') || '';
        const videoId = extractVideoId(href);
        if (!videoId) return;
        
        link.dataset.ziasubDone = '1';
        
        const videoUrl = 'https://m.youtube.com/watch?v=' + videoId;
        
        // Get title from parent
        let title = 'Video YouTube';
        const parent = link.closest('ytm-rich-item-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-video-card-renderer, ytm-playlist-video-renderer, ytm-media-item');
        if (parent) {
          const titleEl = parent.querySelector('h3, h4, .media-item-headline, .YtmCompactMediaItemHeadline');
          if (titleEl) title = titleEl.textContent.trim() || title;
        }
        
        // Make link relative for absolute positioning
        link.style.position = 'relative';
        link.style.display = 'block';
        
        // Add translated badge
        if (translatedVideoIds.has(videoId) && !link.querySelector('.ziasub-badge')) {
          const badge = document.createElement('div');
          badge.className = 'ziasub-badge';
          badge.textContent = 'Đã dịch';
          badge.style.cssText = 'position:absolute;top:4px;left:4px;background:rgba(155,126,217,0.9);color:#fff;font-size:9px;font-weight:600;padding:2px 5px;border-radius:3px;z-index:10;pointer-events:none;';
          link.appendChild(badge);
        }
        
        // Add queue button
        addQueueButton(link, videoId, videoUrl, title);
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
          portraitBottom = d.payload.portraitBottom || 12;
          landscapeBottom = d.payload.landscapeBottom || 8;
          updateSubtitleStyle();
        } else if (d.type === 'setTranslatedVideos') {
          // Update translated video IDs and mark them
          translatedVideoIds = new Set(d.payload || []);
          markVideos();
        } else if (d.type === 'setQueuedVideos') {
          // Update queued video IDs
          const newQueuedIds = new Set(d.payload || []);
          
          // Update existing buttons that changed state
          document.querySelectorAll('.ziasub-queue-btn').forEach(btn => {
            const videoId = btn.dataset.videoId;
            if (!videoId) return;
            
            const wasQueued = queuedVideoIds.has(videoId);
            const isNowQueued = newQueuedIds.has(videoId);
            
            if (wasQueued && !isNowQueued) {
              // Was removed from queue - reset to + button
              btn.textContent = '+';
              btn.style.background = 'rgba(0,0,0,0.7) !important';
            } else if (!wasQueued && isNowQueued) {
              // Was added to queue - show checkmark
              btn.textContent = '✓';
              btn.style.background = 'rgba(76,175,80,0.9) !important';
            }
          });
          
          queuedVideoIds = newQueuedIds;
          markVideos();
        }
      } catch (e) {}
    }, 16);
    
    // Observe DOM changes to mark new video thumbnails
    const observer = new MutationObserver(throttle(() => {
      markVideos();
    }, 500));
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

    // Check subtitle layer position more frequently (every 500ms instead of 3s)
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
    
    // Initial mark videos after DOM is ready
    if (document.readyState === 'complete') {
      setTimeout(markVideos, 500);
    } else {
      window.addEventListener('load', () => setTimeout(markVideos, 500), { once: true });
    }
    
    // Also periodically check for new videos (in case MutationObserver misses some)
    setInterval(markVideos, 2000);
  })();
  true;
`;
