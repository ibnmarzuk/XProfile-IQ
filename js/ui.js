/* ═══════════════════════════════════════════════════════════
   UI.JS — XProfile IQ
   All DOM rendering functions, page transitions,
   profile display, follower cards, activity, insights
═══════════════════════════════════════════════════════════ */

const UI = (() => {

  /* ─────────────────────────────────────────────────────────
     PRIVATE HELPERS
  ───────────────────────────────────────────────────────── */

  /**
   * Format large numbers compactly
   */
  function _fmt(n) {
    if (!n || isNaN(n)) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(Math.round(n));
  }

  /**
   * Escape HTML to prevent XSS
   */
  function _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /**
   * Get element by id — throws if missing
   */
  function _el(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`UI: element #${id} not found`);
    return el;
  }

  /**
   * Set inner HTML safely
   */
  function _setHTML(id, html) {
    const el = _el(id);
    if (el) el.innerHTML = html;
  }

  /* ─────────────────────────────────────────────────────────
     PAGE TRANSITIONS
  ───────────────────────────────────────────────────────── */

  /**
   * Show search page, hide dashboard
   */
  function showSearchPage() {
    const search    = _el('page-search');
    const dashboard = _el('page-dashboard');
    if (dashboard) {
      dashboard.classList.remove('page--active');
      dashboard.style.display = 'none';
    }
    if (search) {
      search.style.display = 'flex';
      search.classList.add('page--active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Show dashboard page, hide search
   */
  function showDashboard() {
    const search    = _el('page-search');
    const dashboard = _el('page-dashboard');
    if (search) {
      search.classList.remove('page--active');
      search.style.display = 'none';
    }
    if (dashboard) {
      dashboard.style.display = 'flex';
      dashboard.classList.add('page--active');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─────────────────────────────────────────────────────────
     SEARCH STATES
  ───────────────────────────────────────────────────────── */

  /**
   * Set search button to loading state
   */
  function setSearchLoading(isLoading) {
    const btns = [_el('search-btn'), _el('search-btn-mini')];
    const inputs = [_el('search-input'), _el('search-input-mini')];

    btns.forEach(btn => {
      if (!btn) return;
      if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
    });

    inputs.forEach(input => {
      if (input) input.disabled = isLoading;
    });
  }

  /**
   * Show / hide inline search error
   */
  function showSearchError(message) {
    const el = _el('search-error');
    if (!el) return;
    if (message) {
      el.textContent = message;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
      el.textContent = '';
    }
  }

  /* ─────────────────────────────────────────────────────────
     RECENT SEARCHES
  ───────────────────────────────────────────────────────── */

  /**
   * Render recent search chips
   */
  function renderRecentSearches(recents) {
    const container = _el('recent-searches');
    if (!container) return;

    if (!recents || recents.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <div class="recent-searches__label">
        🕐 Recent
      </div>
      ${recents.map(handle => `
        <button
          class="recent-chip"
          data-handle="${_escape(handle)}"
          aria-label="Search ${_escape(handle)}"
        >
          @${_escape(handle)}
        </button>
      `).join('')}
    `;
  }

  /* ─────────────────────────────────────────────────────────
     PROFILE HEADER
  ───────────────────────────────────────────────────────── */

  /**
   * Render the main profile header card
   */
  function renderProfileHeader(profile) {
    const container = _el('profile-header');
    if (!container) return;

    const avatarSrc  = _escape(profile.avatar  || '');
    const name       = _escape(profile.name    || 'Unknown');
    const username   = _escape(profile.username || '');
    const bio        = _escape(profile.bio      || '');
    const location   = _escape(profile.location || '');
    const joined     = _escape(profile.joined   || '');
    const website    = _escape(profile.website  || '');

    container.innerHTML = `
      <div class="profile-avatar-wrap">
        <img
          class="profile-avatar"
          src="${avatarSrc}"
          alt="${name}'s avatar"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%231A1A28%22/><text x=%2250%22 y=%2260%22 text-anchor=%22middle%22 font-size=%2240%22>👤</text></svg>'"
        />
        ${profile.verified ? '<div class="profile-verified" title="Verified">✓</div>' : ''}
      </div>

      <div class="profile-header__info">
        <div class="profile-name">
          ${name}
          ${profile.verified ? '<span class="badge badge--blue">Verified</span>' : ''}
          <span class="badge badge--${profile.followersCount > 100000 ? 'gold' : 'purple'}">
            ${profile.followersCount > 1_000_000 ? 'Mega' :
              profile.followersCount > 100_000   ? 'Macro' :
              profile.followersCount > 10_000    ? 'Mid' :
              profile.followersCount > 1_000     ? 'Micro' : 'Nano'}
          </span>
        </div>

        <div class="profile-handle">@${username}</div>

        ${bio ? `<p class="profile-bio">${bio}</p>` : ''}

        <div class="profile-meta">
          ${location ? `
            <div class="profile-meta__item">
              <span>📍</span>
              <span>${location}</span>
            </div>
          ` : ''}
          ${joined ? `
            <div class="profile-meta__item">
              <span>📅</span>
              <span>Joined ${joined}</span>
            </div>
          ` : ''}
          ${website ? `
            <div class="profile-meta__item">
              <span>🔗</span>
              
                href="${website.startsWith('http') ? website : 'https://' + website}"
                target="_blank"
                rel="noopener noreferrer"
                style="color: var(--accent-blue)"
              >${website.replace(/^https?:\/\//, '').slice(0, 30)}</a>
            </div>
          ` : ''}
        </div>

        <div class="profile-stats">
          <div class="profile-stat">
            <span class="profile-stat__num">${_fmt(profile.followersCount)}</span>
            <span class="profile-stat__label">Followers</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__num">${_fmt(profile.followingCount)}</span>
            <span class="profile-stat__label">Following</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__num">${_fmt(profile.tweetsCount)}</span>
            <span class="profile-stat__label">Tweets</span>
          </div>
          <div class="profile-stat">
            <span class="profile-stat__num">${_fmt(profile.likesCount)}</span>
            <span class="profile-stat__label">Likes Given</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render sidebar mini profile
   */
  function renderSidebarProfile(profile) {
    const container = _el('sidebar-profile');
    if (!container) return;

    container.innerHTML = `
      <img
        class="sidebar-avatar"
        src="${_escape(profile.avatar || '')}"
        alt="${_escape(profile.name || '')}"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 fill=%22%231A1A28%22/><text x=%2250%22 y=%2260%22 text-anchor=%22middle%22 font-size=%2240%22>👤</text></svg>'"
      />
      <div class="sidebar-name">${_escape(profile.name || 'Unknown')}</div>
      <div class="sidebar-handle">@${_escape(profile.username || '')}</div>
      <div style="margin-top: var(--space-2)">
        <span class="badge badge--blue">${_fmt(profile.followersCount)} followers</span>
      </div>
    `;
  }

  /* ─────────────────────────────────────────────────────────
     IQ SCORE CARD
  ───────────────────────────────────────────────────────── */

  /**
   * Render the full IQ score card
   */
  function renderScoreCard(iqScore) {
    const container = _el('score-body');
    if (!container) return;

    container.innerHTML = `
      <div id="score-circle-container"></div>

      <div class="score-breakdown" id="score-breakdown-bars">
        <!-- filled by CHARTS.renderBreakdownBars -->
      </div>
    `;

    // Append verdict below score body
    const card = container.closest('.score-card');
    if (card) {
      // Remove old verdict if re-rendering
      const old = card.querySelector('.score-verdict');
      if (old) old.remove();

      card.insertAdjacentHTML('beforeend', `
        <div class="score-verdict">
          <div style="display:flex; align-items:center; gap: var(--space-3); margin-bottom: var(--space-3)">
            <span class="score-grade score-grade--${iqScore.grade}">${iqScore.grade}</span>
            <div>
              <div style="font-weight:700; color: var(--text-primary)">${iqScore.label} Profile</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted)">IQ Score ${iqScore.score}/100</div>
            </div>
          </div>
          <p>${_escape(iqScore.verdict)}</p>
        </div>
      `);
    }

    // Render charts
    CHARTS.renderScoreCircle('score-circle-container', iqScore.score, iqScore.grade);
    CHARTS.renderBreakdownBars('score-breakdown-bars', iqScore.breakdown);
  }

  /* ─────────────────────────────────────────────────────────
     FOLLOWER INTELLIGENCE
  ───────────────────────────────────────────────────────── */

  /**
   * Render follower intelligence section
   */
  function renderFollowerCards(followers) {
    const container = _el('followers-grid');
    if (!container) return;

    container.innerHTML = `
      <!-- Ratio card -->
      <div class="follower-card">
        <div class="follower-card__title">📊 Follower / Following Ratio</div>
        <div id="ratio-bar-container"></div>
        <div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Ratio</span>
            <span class="follower-stat-row__value">${followers.ratio}:1</span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Account Type</span>
            <span class="follower-stat-row__value">
              ${followers.isAuthority  ? '👑 Authority'    :
                followers.isInfluencer ? '⭐ Influencer'   :
                followers.isNiche      ? '💡 Niche Creator' :
                followers.isMassFollower ? '🔄 Mass Follower' :
                                          '📈 Growing'}
            </span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Audience Tier</span>
            <span class="follower-stat-row__value">
              ${followers.tier.emoji} ${followers.tier.label}-tier
            </span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Ratio Score</span>
            <span class="follower-stat-row__value" style="color: var(--accent-blue)">
              ${followers.ratioScore}/100
            </span>
          </div>
        </div>
      </div>

      <!-- Audience quality card -->
      <div class="follower-card">
        <div class="follower-card__title">👥 Audience Breakdown</div>
        <div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Total Followers</span>
            <span class="follower-stat-row__value">${_fmt(followers.followers)}</span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Total Following</span>
            <span class="follower-stat-row__value">${_fmt(followers.following)}</span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Audience Score</span>
            <span class="follower-stat-row__value" style="color: var(--accent-purple)">
              ${followers.audienceScore}/100
            </span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">High Ratio</span>
            <span class="follower-stat-row__value">
              ${followers.isHighRatio ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div class="follower-stat-row">
            <span class="follower-stat-row__label">Authority Signal</span>
            <span class="follower-stat-row__value">
              ${followers.isAuthority ? '✅ Strong' :
                followers.isInfluencer ? '🟡 Moderate' : '❌ Developing'}
            </span>
          </div>
        </div>
      </div>
    `;

    // Render ratio bar chart
    CHARTS.renderRatioBar(
      'ratio-bar-container',
      followers.followerPct,
      followers.followingPct,
      followers.followers,
      followers.following
    );
  }

  /* ─────────────────────────────────────────────────────────
     ACTIVITY SECTION
  ───────────────────────────────────────────────────────── */

  /**
   * Render activity timeline section
   */
  function renderActivity(activity, tweets) {
    const container = _el('activity-card');
    if (!container) return;

    container.innerHTML = `
      <!-- Weekly bars -->
      <div id="activity-bars-container"></div>

      <!-- Activity stats -->
      <div class="activity-stats">
        <div class="activity-stat">
          <span class="activity-stat__value">${activity.tweetsPerDay < 1
            ? activity.tweetsPerDay.toFixed(2)
            : activity.tweetsPerDay.toFixed(1)}</span>
          <span class="activity-stat__label">Tweets/Day</span>
        </div>
        <div class="activity-stat">
          <span class="activity-stat__value">${activity.tweetsPerWeek}</span>
          <span class="activity-stat__label">Tweets/Week</span>
        </div>
        <div class="activity-stat">
          <span class="activity-stat__value">${activity.lastActive}</span>
          <span class="activity-stat__label">Last Active</span>
        </div>
      </div>

      <!-- Account age row -->
      <div style="
        display: flex;
        justify-content: space-between;
        padding: var(--space-3) var(--space-4);
        background: var(--bg-tertiary);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
      ">
        <span style="color: var(--text-secondary)">Account Age</span>
        <span style="font-weight: 600">${_formatAge(activity.accountAgeDays)}</span>
      </div>

      <!-- Recent tweets -->
      ${tweets && tweets.length > 0 ? `
        <div>
          <div class="activity-chart-label" style="margin-bottom: var(--space-3)">
            Recent Tweets
          </div>
          <div class="recent-tweets">
            ${tweets.slice(0, 3).map(t => `
              <div class="tweet-item">
                <div class="tweet-item__text">${_escape(t.text || '').slice(0, 180)}${
                  (t.text || '').length > 180 ? '…' : ''
                }</div>
                <div class="tweet-item__meta">
                  <span class="tweet-item__stat">❤️ ${_fmt(t.likes)}</span>
                  <span class="tweet-item__stat">🔁 ${_fmt(t.retweets)}</span>
                  <span class="tweet-item__stat">💬 ${_fmt(t.replies)}</span>
                  ${t.views ? `<span class="tweet-item__stat">👁 ${_fmt(t.views)}</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    // Render activity bars
    CHARTS.renderActivityBars('activity-bars-container', activity.weeklyBreakdown);
  }

  /**
   * Format account age in days to human-readable
   */
  function _formatAge(days) {
    if (days >= 365) {
      const years  = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      return months > 0 ? `${years}y ${months}m` : `${years} year${years > 1 ? 's' : ''}`;
    }
    if (days >= 30) {
      return `${Math.floor(days / 30)} months`;
    }
    return `${days} days`;
  }

  /* ─────────────────────────────────────────────────────────
     INSIGHTS
  ───────────────────────────────────────────────────────── */

  /**
   * Render insight feed
   */
  function renderInsights(insights) {
    const container = _el('insights-list');
    if (!container) return;

    if (!insights || insights.length === 0) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-state__icon">💡</div>
          <p class="error-state__message">No insights available for this profile.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = insights.map((insight, i) => `
      <div
        class="insight-item"
        style="animation-delay: ${i * 0.1}s"
      >
        <div class="insight-item__icon">${insight.icon}</div>
        <div class="insight-item__content">
          <div class="insight-item__title">${_escape(insight.title)}</div>
          <div class="insight-item__text">${_escape(insight.text)}</div>
        </div>
        <span class="badge badge--${
          insight.type === 'positive' ? 'green' :
          insight.type === 'warning'  ? 'red'   : 'blue'
        }">
          ${insight.type === 'positive' ? '✓ Strong' :
            insight.type === 'warning'  ? '⚠ Watch'  : '→ Neutral'}
        </span>
      </div>
    `).join('');
  }

  /* ─────────────────────────────────────────────────────────
     ERROR STATE
  ───────────────────────────────────────────────────────── */

  /**
   * Render a full-page error state inside dashboard
   */
  function renderErrorState(code, message) {
    const main = document.querySelector('.dashboard-main');
    if (!main) return;

    const icons = {
      NOT_FOUND:  '🔍',
      RATE_LIMIT: '⏳',
      NETWORK:    '📡',
      NO_KEY:     '🔑',
      GENERIC:    '⚠️',
    };

    const titles = {
      NOT_FOUND:  'Profile Not Found',
      RATE_LIMIT: 'Rate Limit Reached',
      NETWORK:    'Connection Error',
      NO_KEY:     'API Key Missing',
      GENERIC:    'Something Went Wrong',
    };

    const hints = {
      NOT_FOUND:  'Double-check the username and make sure the account is public.',
      RATE_LIMIT: 'You\'ve hit the API rate limit. Wait a moment before trying again.',
      NETWORK:    'Check your internet connection and try again.',
      NO_KEY:     'Add your RapidAPI key to js/config.js to enable live data.',
      GENERIC:    'An unexpected error occurred. Please try again.',
    };

    main.innerHTML = `
      <div class="error-state" style="min-height: 60vh">
        <div class="error-state__icon">${icons[code] || icons.GENERIC}</div>
        <div class="error-state__title">${titles[code] || titles.GENERIC}</div>
        <p class="error-state__message">
          ${_escape(message || hints[code] || hints.GENERIC)}
        </p>
        <p class="error-state__message" style="font-size: var(--text-sm); margin-top: var(--space-2)">
          ${hints[code] || ''}
        </p>
        <button
          class="btn btn--primary error-state__btn"
          onclick="UI.showSearchPage()"
        >
          ← Try Another Profile
        </button>
      </div>
    `;
  }

  /* ─────────────────────────────────────────────────────────
     TOAST NOTIFICATIONS
  ───────────────────────────────────────────────────────── */

  let _toastTimer = null;

  /**
   * Show a toast notification
   * @param {string} message
   * @param {'info'|'success'|'error'|'warning'} type
   */
  function showToast(message, type = 'info') {
    const toast = _el('toast');
    if (!toast) return;

    // Clear existing timer
    if (_toastTimer) clearTimeout(_toastTimer);

    toast.textContent = message;
    toast.className   = `toast toast--${type} toast--show`;

    _toastTimer = setTimeout(() => {
      toast.classList.remove('toast--show');
      setTimeout(() => {
        toast.className = 'toast hidden';
      }, 300);
    }, CONFIG.APP.TOAST_DURATION);
  }

  /* ─────────────────────────────────────────────────────────
     SKELETON RESET (before re-render)
  ───────────────────────────────────────────────────────── */

  /**
   * Reset all dashboard sections to skeleton state
   */
  function resetDashboard() {
    _setHTML('profile-header', `
      <div class="skeleton skeleton--avatar skeleton--avatar-lg"></div>
      <div class="profile-header__info">
        <div class="skeleton skeleton--line" style="width:200px"></div>
        <div class="skeleton skeleton--line" style="width:140px; margin-top:8px"></div>
        <div class="skeleton skeleton--line" style="width:320px; margin-top:12px"></div>
      </div>
    `);

    _setHTML('score-body', `
      <div class="skeleton skeleton--score-circle"></div>
      <div class="score-breakdown" style="flex:1">
        <div class="skeleton skeleton--line" style="width:90%"></div>
        <div class="skeleton skeleton--line" style="width:75%; margin-top:8px"></div>
        <div class="skeleton skeleton--line" style="width:60%; margin-top:8px"></div>
        <div class="skeleton skeleton--line" style="width:80%; margin-top:8px"></div>
      </div>
    `);

    // Remove old verdict
    const verdict = document.querySelector('.score-verdict');
    if (verdict) verdict.remove();

    _setHTML('metrics-grid', `
      <div class="metric-card skeleton-card"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--num"></div></div>
      <div class="metric-card skeleton-card"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--num"></div></div>
      <div class="metric-card skeleton-card"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--num"></div></div>
      <div class="metric-card skeleton-card"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--num"></div></div>
    `);

    _setHTML('followers-grid', `
      <div class="skeleton skeleton--block"></div>
      <div class="skeleton skeleton--block"></div>
    `);

    _setHTML('activity-card', `
      <div class="skeleton skeleton--block" style="height:160px"></div>
    `);

    _setHTML('insights-list', `
      <div class="skeleton skeleton--block"></div>
      <div class="skeleton skeleton--block"></div>
      <div class="skeleton skeleton--block"></div>
    `);

    _setHTML('sidebar-profile', `
      <div class="skeleton skeleton--avatar"></div>
      <div class="skeleton skeleton--line" style="width:80%"></div>
      <div class="skeleton skeleton--line" style="width:55%"></div>
    `);
  }

  /* ─────────────────────────────────────────────────────────
     SIDEBAR NAV ACTIVE STATE
  ───────────────────────────────────────────────────────── */

  /**
   * Update active sidebar nav item on scroll
   */
  function initSidebarNav() {
    const sections = [
      'section-score',
      'section-profile',
      'section-engagement',
      'section-followers',
      'section-activity',
      'section-insights',
    ];

    const navItems = document.querySelectorAll('.sidebar-nav__item');

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navItems.forEach(item => item.classList.remove('active'));
          const id = entry.target.id;
          const active = document.querySelector(`.sidebar-nav__item[data-section="${id.replace('section-', '')}"]`);
          if (active) active.classList.add('active');
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /* ─────────────────────────────────────────────────────────
     PLACEHOLDER CYCLING
  ───────────────────────────────────────────────────────── */

  /**
   * Cycle through placeholder handles in search input
   */
  function initPlaceholderCycle() {
    const input   = _el('search-input');
    if (!input) return;

    const handles = CONFIG.PLACEHOLDER_HANDLES;
    let index     = 0;

    setInterval(() => {
      index = (index + 1) % handles.length;
      input.placeholder = handles[index];
    }, 2500);
  }

  /* ─────────────────────────────────────────────────────────
     EXPOSE
  ───────────────────────────────────────────────────────── */
  return {
    showSearchPage,
    showDashboard,
    setSearchLoading,
    showSearchError,
    showToast,
    renderRecentSearches,
    renderProfileHeader,
    renderSidebarProfile,
    renderScoreCard,
    renderFollowerCards,
    renderActivity,
    renderInsights,
    renderErrorState,
    resetDashboard,
    initSidebarNav,
    initPlaceholderCycle,
  };

})();