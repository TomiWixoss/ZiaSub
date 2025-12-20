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
    
    // Subtitle style settings (defaults should match DEFAULT_SUBTITLE_SETTINGS in storage.ts)
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
            
            // Send video title - try multiple selectors for mobile YouTube (including Shorts)
            const isCurrentlyShorts = window.location.href.includes('/shorts/');
            const titleSelectors = isCurrentlyShorts ? [
              // Shorts-specific title selectors (when watching Shorts)
              'yt-shorts-video-title-view-model h2',
              '.ytShortsVideoTitleViewModelShortsVideoTitle',
              'h2.ytShortsVideoTitleViewModelShortsVideoTitle span.yt-core-attributed-string',
              '.reel-player-overlay-metadata h2',
              'video[title]'
            ] : [
              // Regular video title selectors
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
              if (el) {
                // Check for title attribute (for video element)
                let title = el.getAttribute('title') || el.textContent;
                if (title) {
                  title = title.trim();
                  if (title && title.length > 3 && title !== 'YouTube' && title !== window.__lastSentTitle) {
                    window.__lastSentTitle = title;
                    window.ReactNativeWebView.postMessage(JSON.stringify({type:'videoTitle',payload:title}));
                    break;
                  }
                }
              }
            }
            
            // Fallback: try to get title from video element's title attribute for Shorts
            if (isCurrentlyShorts && !window.__lastSentTitle) {
              const videoEl = document.querySelector('video[title]');
              if (videoEl) {
                const title = videoEl.getAttribute('title');
                if (title && title.length > 3 && title !== window.__lastSentTitle) {
                  window.__lastSentTitle = title;
                  window.ReactNativeWebView.postMessage(JSON.stringify({type:'videoTitle',payload:title}));
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

    function addQueueButton(container, videoId, videoUrl, title, duration) {
      const isQueued = queuedVideoIds.has(videoId);
      const isTranslated = translatedVideoIds.has(videoId);
      
      const existingBtn = container.querySelector('.ziasub-queue-btn');
      
      // If translated, remove queue button if exists and return
      if (isTranslated) {
        if (existingBtn) existingBtn.remove();
        return;
      }
      
      if (existingBtn) return;
      
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
      if (currentUrl.includes('/watch') || currentUrl.includes('/shorts/')) {
        return;
      }
      
      // Find all links that contain video thumbnails (including Shorts)
      document.querySelectorAll('a[href*="/watch?v="], a[href*="/shorts/"]').forEach(link => {
        // Check if this link contains a thumbnail image
        const hasThumb = link.querySelector('img[src*="ytimg.com"], img[src*="i.ytimg"], ytm-thumbnail-cover, ytm-compact-thumbnail, ytm-shorts-lockup-view-model-v2');
        if (!hasThumb) return;
        
        const href = link.getAttribute('href') || '';
        const videoId = extractVideoId(href);
        if (!videoId) return;
        
        // Determine if this is a Shorts video
        const isShorts = href.includes('/shorts/');
        const videoUrl = isShorts 
          ? 'https://m.youtube.com/shorts/' + videoId
          : 'https://m.youtube.com/watch?v=' + videoId;
        
        // Get title and duration from parent
        let title = 'Video YouTube';
        let duration = null;
        
        // For Shorts, the structure is different - title is inside the link itself
        if (isShorts) {
          // Try h3 with aria-label first (contains full title)
          const h3 = link.querySelector('h3.shortsLockupViewModelHostMetadataTitle');
          if (h3) {
            const ariaLabel = h3.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.length > 3) {
              // aria-label format: "Title – phát video ngắn", extract title part
              const titlePart = ariaLabel.split(' – ')[0].trim();
              if (titlePart && titlePart.length > 3) {
                title = titlePart;
              }
            }
            // Fallback to span text content
            if (title === 'Video YouTube') {
              const span = h3.querySelector('span.yt-core-attributed-string');
              if (span && span.textContent) {
                const spanTitle = span.textContent.trim();
                if (spanTitle && spanTitle.length > 3) {
                  title = spanTitle;
                }
              }
            }
          }
        }
        
        // For regular videos or if Shorts title not found, use parent container
        if (title === 'Video YouTube') {
          const parent = link.closest('ytm-rich-item-renderer, ytm-video-with-context-renderer, ytm-compact-video-renderer, ytm-video-card-renderer, ytm-playlist-video-renderer, ytm-media-item, ytm-shorts-lockup-view-model');
          if (parent) {
            const titleSelectors = [
              'h3', 'h4', '.media-item-headline', '.YtmCompactMediaItemHeadline'
            ];
            
            for (const sel of titleSelectors) {
              const titleEl = parent.querySelector(sel);
              if (titleEl && titleEl.textContent) {
                const foundTitle = titleEl.textContent.trim();
                if (foundTitle && foundTitle.length > 3) {
                  title = foundTitle;
                  break;
                }
              }
            }
            
            // Also try to get title from aria-label on the link itself
            if (title === 'Video YouTube') {
              const ariaLabel = link.getAttribute('aria-label');
              if (ariaLabel && ariaLabel.length > 3) {
                title = ariaLabel;
              }
            }
          
            // Try to get duration from thumbnail overlay
            const durationSelectors = [
              '.ytm-thumbnail-overlay-time-status-renderer span',
              '.badge-shape-wiz__text',
              '[class*="time-status"] span',
              '.ytm-thumbnail-overlay-badge-shape span',
              'ytm-thumbnail-overlay-time-status-renderer'
            ];
            for (const sel of durationSelectors) {
              const durationEl = parent.querySelector(sel);
              if (durationEl && durationEl.textContent) {
                const durationText = durationEl.textContent.trim();
                // Parse duration text like "12:34" or "1:23:45"
                const parts = durationText.split(':').map(p => parseInt(p, 10));
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  duration = parts[0] * 60 + parts[1];
                  break;
                } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                  duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  break;
                }
              }
            }
          }
        }
        
        // Fallback: try to get title from aria-label on link if still not found
        if (title === 'Video YouTube') {
          const ariaLabel = link.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.length > 3) {
            title = ariaLabel;
          }
        }
        
        // Make link relative for absolute positioning
        link.style.position = 'relative';
        link.style.display = 'block';
        
        // Check and update translated badge
        const existingBadge = link.querySelector('.ziasub-badge');
        const shouldHaveBadge = translatedVideoIds.has(videoId);
        
        if (shouldHaveBadge && !existingBadge) {
          // Add badge if video is translated but badge is missing
          const badge = document.createElement('div');
          badge.className = 'ziasub-badge';
          badge.textContent = 'Đã dịch';
          badge.style.cssText = 'position:absolute;top:4px;left:4px;background:rgba(155,126,217,0.9);color:#fff;font-size:9px;font-weight:600;padding:2px 5px;border-radius:3px;z-index:10;pointer-events:none;';
          link.appendChild(badge);
        } else if (!shouldHaveBadge && existingBadge) {
          // Remove badge if video is no longer translated
          existingBadge.remove();
        }
        
        // Add queue button (function handles its own existence check)
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
          updateSubtitleStyle();
        } else if (d.type === 'setTranslatedVideos') {
          // Update translated video IDs and refresh all badges
          translatedVideoIds = new Set(d.payload || []);
          // Force refresh all badges by calling markVideos
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
        } else if (d.type === 'setVideoVolume') {
          // Adjust video volume for TTS ducking
          const video = getVideo();
          if (video) {
            video.volume = Math.max(0, Math.min(1, d.payload));
          }
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
