export const CUSTOM_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";

export const INJECTED_JAVASCRIPT = `
  (function() {
    // Cache DOM references
    let subtitleLayer = null;
    let cachedVideo = null;
    let lastTime = -1;
    let lastSubtitle = '';
    let rafId = null;
    let parentCheckId = null;
    let isPolling = false;
    
    // Subtitle style settings
    let subtitleFontSize = 15;
    let subtitleFontWeight = 'bold';
    let subtitleFontStyle = 'normal';

    // Throttle function for performance
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

    // 1. Setup Subtitle Layer (optimized with GPU acceleration)
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
    
    // Update subtitle style with GPU acceleration
    function updateSubtitleStyle() {
      if (!subtitleLayer) return;
      const weight = subtitleFontWeight === 'bold' ? '600' : '400';
      const textStroke = '-webkit-text-stroke:0.8px #000;paint-order:stroke fill;';
      const textShadow = 'text-shadow:0 0 2px #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 -1px 0 #000,0 1px 0 #000,-1px 0 0 #000,1px 0 0 #000;';
      // Added transform:translateZ(0) for GPU layer promotion
      subtitleLayer.style.cssText = 'position:absolute;bottom:8px;left:5%;right:5%;max-width:90%;margin:0 auto;text-align:center;color:#FFF;font-size:' + subtitleFontSize + 'px;font-weight:' + weight + ';font-style:' + subtitleFontStyle + ';font-family:system-ui,sans-serif;' + textStroke + textShadow + 'pointer-events:none;z-index:2147483647;display:' + (lastSubtitle ? 'block' : 'none') + ';line-height:1.5;white-space:pre-line;transform:translateZ(0);backface-visibility:hidden;contain:layout style paint';
    }

    // 2. Optimized video element finder with caching
    function getVideo() {
      if (cachedVideo && document.contains(cachedVideo)) return cachedVideo;
      cachedVideo = document.querySelector('video');
      return cachedVideo;
    }

    // 3. Time Polling using requestAnimationFrame for smoother performance
    function startTimePolling() {
      if (isPolling) return;
      isPolling = true;
      
      let lastPollTime = 0;
      const POLL_INTERVAL = 200; // ms between polls
      
      const poll = (timestamp) => {
        if (!isPolling) return;
        
        if (timestamp - lastPollTime >= POLL_INTERVAL) {
          lastPollTime = timestamp;
          const video = getVideo();
          if (video && !video.paused) {
            const t = video.currentTime;
            if (Math.abs(t - lastTime) > 0.2) {
              lastTime = t;
              window.ReactNativeWebView.postMessage('{"type":"currentTime","payload":' + t + '}');
            }
          }
        }
        rafId = requestAnimationFrame(poll);
      };
      
      rafId = requestAnimationFrame(poll);
    }

    // 4. Listen for Subtitles from RN (optimized with batched updates)
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
          updateSubtitleStyle();
        }
      } catch (e) {}
    }, 16); // ~60fps throttle

    document.addEventListener('message', handleMessage, { passive: true });
    window.addEventListener('message', handleMessage, { passive: true });

    // 5. Handle Fullscreen (optimized)
    function handleFullscreenChange() {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const layer = initSubtitleLayer();
      if (fs) {
        fs.appendChild(layer);
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_open"}');
      } else {
        document.body.appendChild(layer);
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_close"}');
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange, { passive: true });
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange, { passive: true });

    // 6. Parent check - less frequent (3s instead of 2s)
    parentCheckId = setInterval(() => {
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const target = fs || document.body;
      const layer = initSubtitleLayer();
      if (layer.parentElement !== target) {
        target.appendChild(layer);
      }
    }, 3000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      isPolling = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (parentCheckId) clearInterval(parentCheckId);
    }, { passive: true });

    // Initialize
    initSubtitleLayer();
    startTimePolling();

  })();
  true;
`;
