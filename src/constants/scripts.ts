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
      
      subtitleLayer.style.cssText = 'position:absolute;bottom:' + bottomPos + 'px;left:5%;right:5%;max-width:90%;margin:0 auto;text-align:center;color:#FFF;font-size:' + subtitleFontSize + 'px;font-weight:' + weight + ';font-style:' + subtitleFontStyle + ';font-family:system-ui,sans-serif;' + textStroke + textShadow + bgStyle + 'pointer-events:none;z-index:2147483647;display:' + (lastSubtitle ? 'block' : 'none') + ';line-height:1.5;white-space:pre-line;transform:translateZ(0);backface-visibility:hidden;contain:layout style paint';
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
        }
      } catch (e) {}
    }, 16);

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
