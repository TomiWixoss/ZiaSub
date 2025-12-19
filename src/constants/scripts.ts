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

    function getVideo() {
      if (cachedVideo && document.contains(cachedVideo)) return cachedVideo;
      cachedVideo = document.querySelector('video');
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

    // Translated video IDs set
    let translatedVideoIds = new Set();

    function markTranslatedVideos() {
      if (translatedVideoIds.size === 0) return;
      
      // Find all video thumbnails/links
      const videoLinks = document.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]');
      
      videoLinks.forEach(link => {
        // Skip if already marked
        if (link.querySelector('.ziasub-translated-badge')) return;
        
        const href = link.getAttribute('href') || '';
        let videoId = null;
        
        // Extract video ID
        const watchMatch = href.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        const shortsMatch = href.match(/\\/shorts\\/([a-zA-Z0-9_-]+)/);
        if (watchMatch) videoId = watchMatch[1];
        else if (shortsMatch) videoId = shortsMatch[1];
        
        if (videoId && translatedVideoIds.has(videoId)) {
          // Find thumbnail container
          const thumbnail = link.querySelector('ytm-thumbnail-cover, .thumbnail, img');
          const container = thumbnail ? thumbnail.parentElement : link;
          
          if (container && container.style.position !== 'relative') {
            container.style.position = 'relative';
          }
          
          // Create badge
          const badge = document.createElement('div');
          badge.className = 'ziasub-translated-badge';
          badge.textContent = 'Đã dịch';
          badge.style.cssText = 'position:absolute;top:4px;left:4px;background:linear-gradient(135deg,#9B7ED9,#7C5CBF);color:#fff;font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;z-index:10;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.3);';
          
          if (container) container.appendChild(badge);
        }
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
          markTranslatedVideos();
        }
      } catch (e) {}
    }, 16);
    
    // Observe DOM changes to mark new video thumbnails
    const observer = new MutationObserver(throttle(() => {
      markTranslatedVideos();
    }, 500));
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('message', handleMessage, { passive: true });
    window.addEventListener('message', handleMessage, { passive: true });

    function handleFullscreenChange() {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const layer = initSubtitleLayer();
      if (fs) {
        fs.appendChild(layer);
        isPortrait = false;
        updateSubtitleStyle();
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_open"}');
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

    parentCheckId = setInterval(() => {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const target = fs || document.body;
      const layer = initSubtitleLayer();
      if (layer.parentElement !== target) {
        target.appendChild(layer);
      }
    }, 3000);

    window.addEventListener('beforeunload', () => {
      isPolling = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (parentCheckId) clearInterval(parentCheckId);
    }, { passive: true });

    initSubtitleLayer();
    startTimePolling();
  })();
  true;
`;
