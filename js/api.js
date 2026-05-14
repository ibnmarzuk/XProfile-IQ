/* ═══════════════════════════════════════════════════════════
   API.JS — XProfile IQ
   All RapidAPI fetch calls, caching, error handling,
   data normalization
═══════════════════════════════════════════════════════════ */

const API = (() => {

  /* ── Internal cache (in-memory + localStorage) ── */
  const _memCache = new Map();

  /* ─────────────────────────────────────────────────────────
     PRIVATE HELPERS
  ───────────────────────────────────────────────────────── */

  /**
   * Core fetch wrapper with error handling
   */
  async function _fetch(url, params = {}) {
    // Check API key
    if (
      !CONFIG.RAPIDAPI_KEY ||
      CONFIG.RAPIDAPI_KEY === 'YOUR_RAPIDAPI_KEY_HERE'
    ) {
      throw new APIError(CONFIG.ERRORS.NO_KEY, 'NO_KEY');
    }

    const qs = new URLSearchParams(params).toString();
    const fullURL = qs ? `${url}?${qs}` : url;

    console.log('🔗 Fetching:', fullURL);

    let response;
    try {
      response = await fetch(fullURL, {
        method: 'GET',
        headers: CONFIG.HEADERS,
      });
    } catch (err) {
      console.error('❌ Network Error:', err);
      throw new APIError(CONFIG.ERRORS.NETWORK, 'NETWORK');
    }

    console.log('📊 Response Status:', response.status);

    if (response.status === 404) {
      throw new APIError(CONFIG.ERRORS.NOT_FOUND, 'NOT_FOUND');
    }

    if (response.status === 429) {
      throw new APIError(CONFIG.ERRORS.RATE_LIMIT, 'RATE_LIMIT');
    }

    if (!response.ok) {
      throw new APIError(CONFIG.ERRORS.GENERIC, 'GENERIC');
    }

    let data;
    try {
      data = await response.json();
      console.log('✅ Response Data:', data);
    } catch {
      throw new APIError(CONFIG.ERRORS.GENERIC, 'PARSE_ERROR');
    }

    // RapidAPI sometimes returns 200 with error body
    if (data?.error || data?.errors || data?.detail) {
      const msg = data.error || data.detail || CONFIG.ERRORS.GENERIC;
      const code = msg.toLowerCase().includes('not found')
        ? 'NOT_FOUND'
        : 'GENERIC';
      throw new APIError(msg, code);
    }

    return data;
  }

  /**
   * Cache key builder
   */
  function _cacheKey(type, username) {
    return `${CONFIG.STORAGE_KEYS.CACHE_PREFIX}${type}_${username.toLowerCase()}`;
  }

  /**
   * Read from cache (memory first, then localStorage)
   */
  function _readCache(key) {
    // Memory cache first
    if (_memCache.has(key)) {
      const entry = _memCache.get(key);
      if (Date.now() < entry.expires) return entry.data;
      _memCache.delete(key);
    }
    // localStorage fallback
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() < entry.expires) {
        _memCache.set(key, entry); // warm memory cache
        return entry.data;
      }
      localStorage.removeItem(key);
    } catch { /* ignore */ }
    return null;
  }

  /**
   * Write to cache (memory + localStorage)
   */
  function _writeCache(key, data) {
    const entry = {
      data,
      expires: Date.now() + CONFIG.APP.CACHE_TTL,
    };
    _memCache.set(key, entry);
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch { /* storage full — memory only */ }
  }

  /* ─────────────────────────────────────────────────────────
     DATA NORMALIZERS
  ───────────────────────────────────────────────────────── */

  /**
   * Normalize raw profile data into a clean shape
   */
  function _normalizeProfile(raw) {
    return {
      id:             raw.id_str        || raw.id          || '',
      name:           raw.name          || 'Unknown',
      username:       raw.screen_name   || raw.screenname  || '',
      bio:            raw.description   || '',
      avatar:         _upgradeAvatar(raw.profile_image_url_https || raw.profile_image_url || ''),
      banner:         raw.profile_banner_url || '',
      verified:       raw.verified      || raw.is_blue_verified || false,
      location:       raw.location      || '',
      website:        raw.url           || raw.entities?.url?.urls?.[0]?.expanded_url || '',
      joinedRaw:      raw.created_at    || '',
      joined:         _formatJoinDate(raw.created_at),
      followersCount: raw.followers_count || 0,
      followingCount: raw.friends_count   || raw.following_count || 0,
      tweetsCount:    raw.statuses_count  || raw.tweet_count     || 0,
      likesCount:     raw.favourites_count || raw.like_count     || 0,
      listedCount:    raw.listed_count   || 0,
      isProtected:    raw.protected      || false,
    };
  }

  /**
   * Normalize timeline tweets into clean shape
   */
  function _normalizeTimeline(raw) {
    const tweets = raw?.timeline || raw?.tweets || raw || [];
    if (!Array.isArray(tweets)) return [];

    return tweets
      .filter(t => t && !t.retweeted_status && !t.RT) // exclude retweets
      .slice(0, CONFIG.APP.TIMELINE_COUNT)
      .map(t => ({
        id:         t.tweet_id     || t.id_str || t.id || '',
        text:       t.text         || t.full_text || '',
        likes:      t.favorites    || t.favorite_count || t.favourites_count || 0,
        retweets:   t.retweets     || t.retweet_count  || 0,
        replies:    t.replies      || t.reply_count    || 0,
        views:      t.views        || t.view_count     || 0,
        createdAt:  t.created_at   || '',
        date:       _parseDate(t.created_at),
        isReply:    !!(t.in_reply_to_status_id || t.in_reply_to_screen_name),
      }));
  }

  /**
   * Upgrade avatar URL to full resolution
   */
  function _upgradeAvatar(url) {
    if (!url) return '';
    return url.replace('_normal', '_400x400');
  }

  /**
   * Format join date to human-readable
   */
  function _formatJoinDate(raw) {
    if (!raw) return 'Unknown';
    try {
      const d = new Date(raw);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Parse date string to Date object safely
   */
  function _parseDate(raw) {
    if (!raw) return null;
    try {
      return new Date(raw);
    } catch {
      return null;
    }
  }

  /* ─────────────────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────────────────── */

  /**
   * Fetch and normalize a user profile
   * @param {string} username
   * @returns {Promise<NormalizedProfile>}
   */
  async function fetchProfile(username) {
    const key = _cacheKey('profile', username);
    const cached = _readCache(key);
    if (cached) return cached;

    const raw = await _fetch(CONFIG.ENDPOINTS.USER_INFO, {
      username: username,
    });

    const normalized = _normalizeProfile(raw);
    _writeCache(key, normalized);
    return normalized;
  }

  /**
   * Fetch and normalize a user's timeline
   * @param {string} username
   * @returns {Promise<NormalizedTweet[]>}
   */
  async function fetchTimeline(username) {
    const key = _cacheKey('timeline', username);
    const cached = _readCache(key);
    if (cached) return cached;

    const raw = await _fetch(CONFIG.ENDPOINTS.TWEETS_REPLIES, {
      user_id: username,
      limit: CONFIG.APP.TIMELINE_COUNT,
    });

    const normalized = _normalizeTimeline(raw);
    _writeCache(key, normalized);
    return normalized;
  }

  /**
   * Fetch both profile + timeline in parallel
   * @param {string} username
   * @returns {Promise<{profile, tweets}>}
   */
  async function fetchAll(username) {
    const clean = username.trim().replace(/^@/, '').toLowerCase();

    if (!clean || clean.length < 1 || clean.length > 50) {
      throw new APIError(CONFIG.ERRORS.INVALID_INPUT, 'INVALID_INPUT');
    }

    // Fetch in parallel — timeline failure is non-fatal
    const [profile, tweets] = await Promise.allSettled([
      fetchProfile(clean),
      fetchTimeline(clean),
    ]);

    // Profile is required
    if (profile.status === 'rejected') {
      throw profile.reason;
    }

    // Timeline is optional — gracefully degrade
    const timelineData = tweets.status === 'fulfilled'
      ? tweets.value
      : [];

    return {
      profile: profile.value,
      tweets:  timelineData,
    };
  }

  /**
   * Clear all cached data
   */
  function clearCache() {
    _memCache.clear();
    try {
      const keys = Object.keys(localStorage).filter(k =>
        k.startsWith(CONFIG.STORAGE_KEYS.CACHE_PREFIX)
      );
      keys.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }

  /* ─────────────────────────────────────────────────────────
     RECENT SEARCHES
  ─────────────────────────────────────��─────────────────── */

  function getRecentSearches() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function addRecentSearch(username) {
    try {
      const clean = username.toLowerCase().replace(/^@/, '');
      let recents = getRecentSearches().filter(u => u !== clean);
      recents.unshift(clean);
      recents = recents.slice(0, CONFIG.APP.MAX_RECENT);
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.RECENT_SEARCHES,
        JSON.stringify(recents)
      );
    } catch { /* ignore */ }
  }

  function clearRecentSearches() {
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.RECENT_SEARCHES);
    } catch { /* ignore */ }
  }

  /* ─────────────────────────────────────────────────────────
     EXPOSE
  ───────────────────────────────────────────────────────── */
  return {
    fetchProfile,
    fetchTimeline,
    fetchAll,
    clearCache,
    getRecentSearches,
    addRecentSearch,
    clearRecentSearches,
  };

})();

/* ═══════════════════════════════════════════════════════════
   CUSTOM ERROR CLASS
═══════════════════════════════════════════════════════════ */
class APIError extends Error {
  constructor(message, code = 'GENERIC') {
    super(message);
    this.name = 'APIError';
    this.code = code;
  }
}
