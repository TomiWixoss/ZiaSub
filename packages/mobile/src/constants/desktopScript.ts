// Desktop YouTube injected script
// Separated for better maintainability

export const INJECTED_JAVASCRIPT_DESKTOP = `
  (function() {
    let subtitleLayer = null;
    let cachedVideo = null;
    let lastTime = -1;
    let lastSubtitle = '';
    let rafId = null;
    let isPolling = false;
    
    // Subtitle style settings
    let subtitleFontSize = 15;
    let subtitleFontWeight = 'bold';
    let subtitleFontStyle = 'normal';
    let portraitBottom = 100;
    let landscapeBottom = 8;
    let desktopShowBackground = true;
    let desktopBottom = 60;

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
      
      const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
      // Use landscapeBottom for fullscreen, desktopBottom for normal view
      const bottomPos = isFullscreen ? landscapeBottom : desktopBottom;
      
      // Background style based on setting
      const bgStyle = desktopShowBackground ? 'background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;' : '';
      
      subtitleLayer.style.cssText = 'position:absolute;bottom:' + bottomPos + 'px;left:5%;right:5%;max-width:90%;margin:0 auto;text-align:center;color:#FFF;font-size:' + subtitleFontSize + 'px;font-weight:' + weight + ';font-style:' + subtitleFontStyle + ';font-family:system-ui,sans-serif;' + textStroke + textShadow + bgStyle + 'pointer-events:none;z-index:2147483647;display:' + (lastSubtitle ? 'block' : 'none') + ';line-height:1.5;white-space:pre-line;';
    }

    function ensureSubtitleInPlayer() {
      const layer = initSubtitleLayer();
      // Desktop YouTube uses #movie_player as the main container
      const player = document.querySelector('#movie_player') || document.fullscreenElement || document.webkitFullscreenElement || document.body;
      if (layer.parentElement !== player) {
        player.appendChild(layer);
        updateSubtitleStyle();
        if (lastSubtitle) {
          layer.textContent = lastSubtitle;
          layer.style.display = 'block';
        }
      }
    }

    function getVideo() {
      // Desktop YouTube uses video.html5-main-video
      const currentVideo = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (currentVideo && cachedVideo !== currentVideo) {
        cachedVideo = currentVideo;
        lastTime = -1;
        lastDurationSent = 0;
        ensureSubtitleInPlayer();
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
      const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipButton) {
        skipButton.click();
        return true;
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
          portraitBottom = d.payload.portraitBottom || 12;
          landscapeBottom = d.payload.landscapeBottom || 8;
          desktopShowBackground = d.payload.desktopShowBackground !== false;
          desktopBottom = d.payload.desktopBottom || 60;
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

    function handleFullscreenChange() {
      const layer = initSubtitleLayer();
      const fs = document.fullscreenElement || document.webkitFullscreenElement;
      const player = document.querySelector('#movie_player');
      
      if (fs) {
        fs.appendChild(layer);
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_open"}');
      } else if (player) {
        player.appendChild(layer);
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_close"}');
      } else {
        document.body.appendChild(layer);
        window.ReactNativeWebView.postMessage('{"type":"fullscreen_close"}');
      }
      updateSubtitleStyle();
      if (lastSubtitle) {
        layer.textContent = lastSubtitle;
        layer.style.display = 'block';
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange, { passive: true });
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange, { passive: true });

    window.addEventListener('beforeunload', () => {
      isPolling = false;
      if (rafId) cancelAnimationFrame(rafId);
    }, { passive: true });

    initSubtitleLayer();
    startTimePolling();
    
    if (document.readyState === 'complete') {
      setTimeout(markVideos, 500);
    } else {
      window.addEventListener('load', () => setTimeout(markVideos, 500), { once: true });
    }
    
    setInterval(markVideos, 2000);
    setInterval(ensureSubtitleInPlayer, 500);
  })();
  true;
`;
