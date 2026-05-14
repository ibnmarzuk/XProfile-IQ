/* ═══════════════════════════════════════════════════════════
   CONFIG.JS — XProfile IQ
   API keys, endpoints, constants, app configuration
═══════════════════════════════════════════════════════════ */

const CONFIG = {

  // ── RapidAPI Credentials ──────────────────────────────────
  // Get yours free at: https://rapidapi.com/
  RAPIDAPI_KEY: '290f2cb866mshffddb2a74f2425cp18f19fjsn85f166580c4e',

  // ── API Host & Endpoints ─────────────────────��────────────
  API_HOST: 'twitter-x.p.rapidapi.com',

  ENDPOINTS: {
    TWEETS_REPLIES: 'https://twitter-x.p.rapidapi.com/user/tweetsandreplies',
    USER_INFO:      'https://twitter-x.p.rapidapi.com/user/info',
    SEARCH:         'https://twitter-x.p.rapidapi.com/search',
  },

  // ── Request Headers ───────────────────────────────────────
  get HEADERS() {
    return {
      'x-rapidapi-key':  this.RAPIDAPI_KEY,
      'x-rapidapi-host': this.API_HOST,
    };
  },

  // ── App Settings ──────────────────────────────────────────
  APP: {
    NAME:             'XProfile IQ',
    VERSION:          '1.0.0',
    MAX_RECENT:       5,           // max recent searches to store
    TIMELINE_COUNT:   20,          // tweets to fetch for analysis
    CACHE_TTL:        1000 * 60 * 15, // 15 min cache per profile
    SCORE_ANIM_DURATION: 1500,     // ms for score count-up
    TOAST_DURATION:   3500,        // ms toast stays visible
  },

  // ── Scoring Weights ───────────────────────────────────────
  SCORE_WEIGHTS: {
    ENGAGEMENT:  0.40,
    RATIO:       0.25,
    ACTIVITY:    0.20,
    AUDIENCE:    0.15,
  },

  // ── Grade Thresholds ──────────────────────────────────────
  GRADES: [
    { min: 90, grade: 'S', label: 'Elite',       color: '#F59E0B' },
    { min: 75, grade: 'A', label: 'Excellent',   color: '#10B981' },
    { min: 55, grade: 'B', label: 'Good',        color: '#4F9FFF' },
    { min: 35, grade: 'C', label: 'Average',     color: '#8B5CF6' },
    { min: 0,  grade: 'D', label: 'Needs Work',  color: '#EF4444' },
  ],

  // ── Sample Placeholder Handles ────────────────────────────
  PLACEHOLDER_HANDLES: [
    'elonmusk',
    'sama',
    'naval',
    'paulg',
    'lexfridman',
    'andreessen',
    'balajis',
  ],

  // ── localStorage Keys ─────────────────────────────────────
  STORAGE_KEYS: {
    RECENT_SEARCHES: 'xprofileiq_recent',
    CACHE_PREFIX:    'xprofileiq_cache_',
  },

  // ── Error Messages ────────────────────────────────────────
  ERRORS: {
    NOT_FOUND:     'Profile not found. Check the username and try again.',
    RATE_LIMIT:    'API rate limit reached. Please wait a moment and try again.',
    NETWORK:       'Network error. Check your connection and try again.',
    INVALID_INPUT: 'Please enter a valid X username.',
    GENERIC:       'Something went wrong. Please try again.',
    NO_KEY:        'API key not configured. Add your RapidAPI key in config.js.',
  },

};

/* ── Freeze config to prevent accidental mutation ── */
Object.freeze(CONFIG.SCORE_WEIGHTS);
Object.freeze(CONFIG.APP);
Object.freeze(CONFIG.ENDPOINTS);
