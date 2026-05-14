/* ═══════════════════════════════════════════════════════════
   CHARTS.JS — XProfile IQ
   Pure canvas/SVG visualizations — no dependencies
   Activity bars, ratio bar, score circle, sparklines
═══════════════════════════════════════════════════════════ */

const CHARTS = (() => {

  /* ─────────────────────────────────────────────────────────
     PRIVATE HELPERS
  ───────────────────────────────────────────────────────── */

  /**
   * Get CSS variable value from :root
   */
  function _cssVar(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  /**
   * Clamp value between min and max
   */
  function _clamp(val, min = 0, max = 100) {
    return Math.min(Math.max(val, min), max);
  }

  /**
   * Format number compactly
   */
  function _fmt(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(Math.round(n));
  }

  /* ─────────────────────────────────────────────────────────
     SCORE CIRCLE (SVG)
  ───────────────────────────────────────────────────────── */

  /**
   * Render animated SVG score circle
   * @param {string} containerId - element id to render into
   * @param {number} score       - 0 to 100
   * @param {string} grade       - S/A/B/C/D
   */
  function renderScoreCircle(containerId, score, grade) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const radius      = 54;
    const circumference = 2 * Math.PI * radius; // ~339.3
    const offset      = circumference - (score / 100) * circumference;

    container.innerHTML = `
      <div class="score-circle-wrap">
        <svg
          class="score-circle-svg"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <!-- Background track -->
          <circle
            class="score-circle-bg"
            cx="60" cy="60" r="${radius}"
            fill="none"
            stroke="var(--bg-tertiary)"
            stroke-width="10"
          />
          <!-- Score fill -->
          <circle
            class="score-circle-fill score-circle-fill--${grade}"
            id="score-arc"
            cx="60" cy="60" r="${radius}"
            fill="none"
            stroke-width="10"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            transform="rotate(-90 60 60)"
          />
        </svg>

        <!-- Center text -->
        <div class="score-circle-text">
          <span class="score-number" id="score-number">0</span>
          <span class="score-label">IQ Score</span>
        </div>
      </div>
    `;

    // Animate after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Arc animation
        const arc = document.getElementById('score-arc');
        if (arc) {
          arc.style.transition = `stroke-dashoffset ${CONFIG.APP.SCORE_ANIM_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
          arc.style.strokeDashoffset = offset;
        }

        // Count-up animation
        _countUp('score-number', 0, score, CONFIG.APP.SCORE_ANIM_DURATION);
      }, 100);
    });
  }

  /* ─────────────────────────────────────────────────────────
     COUNT-UP ANIMATION
  ───────────────────────────────────────────────────────── */

  /**
   * Animate a number counting up
   * @param {string} elementId
   * @param {number} from
   * @param {number} to
   * @param {number} duration - ms
   */
  function _countUp(elementId, from, to, duration) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const start     = performance.now();
    const range     = to - from;

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value  = Math.round(from + range * eased);

      el.textContent = value;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = to;
        el.classList.add('score-number--done');
      }
    }

    requestAnimationFrame(tick);
  }

  /* ─────────────────────────────────────────────────────────
     PROGRESS BARS (Score Breakdown)
  ───────────────────────────────────────────────────────── */

  /**
   * Render animated progress bars for score breakdown
   * @param {string} containerId
   * @param {object} breakdown - from iqScore.breakdown
   */
  function renderBreakdownBars(containerId, breakdown) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = Object.values(breakdown);

    container.innerHTML = items.map(item => `
      <div class="score-breakdown__item">
        <div class="score-breakdown__header">
          <span class="score-breakdown__label">${item.label}</span>
          <span class="score-breakdown__value">${item.score}/100</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-bar__fill progress-bar__fill--${item.color}"
            data-width="${item.score}"
            style="width: 0%"
          ></div>
        </div>
      </div>
    `).join('');

    // Animate bars after paint
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll('.progress-bar__fill').forEach(bar => {
          const target = bar.dataset.width;
          bar.style.width = `${target}%`;
        });
      }, 200);
    });
  }

  /* ─────────────────────────────────────────────────────────
     WEEKLY ACTIVITY BARS
  ───────────────────────────────────────────────────────── */

  /**
   * Render tweet frequency bars for the last 7 days
   * @param {string} containerId
   * @param {array}  weeklyBreakdown - [{label, count, date}]
   */
  function renderActivityBars(containerId, weeklyBreakdown) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!weeklyBreakdown || weeklyBreakdown.length === 0) {
      container.innerHTML = `
        <div class="activity-chart-wrap">
          <p class="text-secondary text-sm">No activity data available.</p>
        </div>
      `;
      return;
    }

    const maxCount = Math.max(...weeklyBreakdown.map(d => d.count), 1);

    const barsHTML = weeklyBreakdown.map(day => {
      const heightPct = _clamp(Math.round((day.count / maxCount) * 100), 4, 100);
      const isToday   = day.label === new Date().toLocaleDateString('en-US', { weekday: 'short' });

      return `
        <div
          class="freq-bar${isToday ? ' freq-bar--today' : ''}"
          style="height: 0%; --bar-target: ${heightPct}%"
          title="${day.label}: ${day.count} tweet${day.count !== 1 ? 's' : ''}"
        >
          <div class="freq-bar__tooltip">${day.label}: ${day.count}</div>
        </div>
      `;
    }).join('');

    const labelsHTML = weeklyBreakdown.map(day => `
      <span class="freq-label">${day.label}</span>
    `).join('');

    container.innerHTML = `
      <div class="activity-chart-wrap">
        <span class="activity-chart-label">Tweets — Last 7 Days</span>
        <div class="freq-bars" id="freq-bars-inner">
          ${barsHTML}
        </div>
        <div class="freq-labels">
          ${labelsHTML}
        </div>
      </div>
    `;

    // Animate bars growing up
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll('.freq-bar').forEach(bar => {
          const target = bar.style.getPropertyValue('--bar-target');
          bar.style.height = target;
        });
      }, 150);
    });
  }

  /* ─────────────────────────────────────────────────────────
     FOLLOWER RATIO BAR
  ───────────────────────────────────────────────────────── */

  /**
   * Render follower vs following ratio bar
   * @param {string} containerId
   * @param {number} followerPct  - 0–100
   * @param {number} followingPct - 0–100
   * @param {number} followers
   * @param {number} following
   */
  function renderRatioBar(containerId, followerPct, followingPct, followers, following) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="follower-ratio-visual">
        <div class="ratio-bar">
          <div
            class="ratio-bar__followers"
            style="width: 0%"
            data-width="${followerPct}"
            title="Followers: ${_fmt(followers)}"
          ></div>
          <div
            class="ratio-bar__following"
            style="width: 0%"
            data-width="${followingPct}"
            title="Following: ${_fmt(following)}"
          ></div>
        </div>
        <div class="ratio-legend">
          <div class="ratio-legend__item">
            <span class="ratio-legend__dot ratio-legend__dot--blue"></span>
            Followers <strong>${_fmt(followers)}</strong>
          </div>
          <div class="ratio-legend__item">
            <span class="ratio-legend__dot ratio-legend__dot--purple"></span>
            Following <strong>${_fmt(following)}</strong>
          </div>
        </div>
      </div>
    `;

    // Animate
    requestAnimationFrame(() => {
      setTimeout(() => {
        container.querySelectorAll('[data-width]').forEach(el => {
          el.style.width = `${el.dataset.width}%`;
        });
      }, 200);
    });
  }

  /* ─────────────────────────────────────────────────────────
     ENGAGEMENT SPARKLINE (Canvas)
  ───────────────────────────────────────────────────────── */

  /**
   * Draw a mini sparkline of likes over recent tweets
   * @param {string} canvasId
   * @param {array}  tweets
   * @param {string} color   - CSS hex color
   */
  function renderSparkline(canvasId, tweets, color = '#4F9FFF') {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !tweets || tweets.length < 2) return;

    const ctx    = canvas.getContext('2d');
    const width  = canvas.width;
    const height = canvas.height;
    const data   = tweets.slice(0, 20).map(t => t.likes || 0).reverse();
    const max    = Math.max(...data, 1);
    const min    = Math.min(...data, 0);
    const range  = max - min || 1;
    const pad    = 4;

    ctx.clearRect(0, 0, width, height);

    const points = data.map((val, i) => ({
      x: pad + (i / (data.length - 1)) * (width - pad * 2),
      y: height - pad - ((val - min) / range) * (height - pad * 2),
    }));

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0,   color + '55');
    gradient.addColorStop(1,   color + '00');

    // Draw fill
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p, i) => {
      if (i === 0) return;
      const prev = points[i - 1];
      const cpx  = (prev.x + p.x) / 2;
      ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Draw last point dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle   = color;
    ctx.fill();
  }

  /* ─────────────────────────────────────────────────────────
     METRIC CARDS RENDER
  ───────────────────────────────────────────────────────── */

  /**
   * Render the 4 engagement metric cards
   * @param {string} containerId
   * @param {object} engagement
   * @param {object} followers
   */
  function renderMetricCards(containerId, engagement, followers) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cards = [
      {
        icon:  '❤️',
        label: 'Avg Likes',
        value: _fmt(engagement.avgLikes),
        sub:   `${_fmt(engagement.totalLikes)} total`,
        delta: _getDelta(engagement.avgLikes, 100),
        color: 'red',
      },
      {
        icon:  '🔁',
        label: 'Avg Retweets',
        value: _fmt(engagement.avgRetweets),
        sub:   `${_fmt(engagement.totalRetweets)} total`,
        delta: _getDelta(engagement.avgRetweets, 50),
        color: 'green',
      },
      {
        icon:  '💬',
        label: 'Avg Replies',
        value: _fmt(engagement.avgReplies),
        sub:   `${_fmt(engagement.totalReplies)} total`,
        delta: _getDelta(engagement.avgReplies, 20),
        color: 'blue',
      },
      {
        icon:  '📊',
        label: 'Engagement Rate',
        value: `${engagement.engagementRate}%`,
        sub:   `${engagement.tweetCount} tweets analyzed`,
        delta: _getEngagementDelta(engagement.engagementRate),
        color: 'purple',
      },
    ];

    container.innerHTML = cards.map(card => `
      <div class="metric-card">
        <div class="metric-card__icon">${card.icon}</div>
        <div>
          <div class="metric-card__label">${card.label}</div>
          <div class="metric-card__value">${card.value}</div>
          <div class="metric-card__sub">${card.sub}</div>
        </div>
        <span class="metric-card__delta metric-card__delta--${card.delta.dir}">
          ${card.delta.label}
        </span>
      </div>
    `).join('');
  }

  /**
   * Get delta label for a metric vs benchmark
   */
  function _getDelta(value, benchmark) {
    if (value >= benchmark * 2) return { dir: 'up',     label: '↑ Excellent' };
    if (value >= benchmark)     return { dir: 'up',     label: '↑ Above avg' };
    if (value >= benchmark / 2) return { dir: 'neutral', label: '→ Average'   };
    return                             { dir: 'down',   label: '↓ Below avg' };
  }

  /**
   * Get engagement rate delta label
   */
  function _getEngagementDelta(er) {
    if (er >= 5)   return { dir: 'up',     label: '↑ Excellent' };
    if (er >= 2)   return { dir: 'up',     label: '↑ Strong'    };
    if (er >= 0.5) return { dir: 'neutral', label: '→ Average'   };
    return                { dir: 'down',   label: '↓ Low'        };
  }

  /* ─────────────────────────────────────────────────────────
     EXPOSE
  ───────────────────────────────────────────────────────── */
  return {
    renderScoreCircle,
    renderBreakdownBars,
    renderActivityBars,
    renderRatioBar,
    renderSparkline,
    renderMetricCards,
  };

})();