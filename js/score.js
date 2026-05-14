/* ═══════════════════════════════════════════════════════════
   SCORE.JS — XProfile IQ
   IQ scoring engine, engagement analysis, insight generation
═══════════════════════════════════════════════════════════ */

const SCORE_ENGINE = (() => {

  /* ─────────────────────────────────────────────────────────
     PRIVATE HELPERS
  ───────────────────────────────────────────────────────── */

  /**
   * Clamp a value between min and max
   */
  function _clamp(val, min = 0, max = 100) {
    return Math.min(Math.max(val, min), max);
  }

  /**
   * Normalize a value to 0–100 scale using log curve
   */
  function _logNorm(value, base = 6) {
    if (!value || value <= 0) return 0;
    return _clamp((Math.log10(value + 1) / base) * 100);
  }

  /**
   * Safe division — returns 0 if divisor is 0
   */
  function _safeDivide(a, b) {
    if (!b || b === 0) return 0;
    return a / b;
  }

  /**
   * Round to N decimal places
   */
  function _round(val, decimals = 2) {
    return Math.round(val * 10 ** decimals) / 10 ** decimals;
  }

  /* ─────────────────────────────────────────────────────────
     ENGAGEMENT ANALYSIS
  ───────────────────────────────────────────────────────── */

  /**
   * Calculate engagement metrics from tweets
   * @param {object} profile - normalized profile
   * @param {array}  tweets  - normalized tweets array
   * @returns {object} engagement metrics
   */
  function calcEngagement(profile, tweets) {
    if (!tweets || tweets.length === 0) {
      return {
        avgLikes:       0,
        avgRetweets:    0,
        avgReplies:     0,
        avgViews:       0,
        engagementRate: 0,
        totalLikes:     0,
        totalRetweets:  0,
        totalReplies:   0,
        tweetCount:     0,
        score:          0,
      };
    }

    const count = tweets.length;

    const totalLikes    = tweets.reduce((s, t) => s + (t.likes    || 0), 0);
    const totalRetweets = tweets.reduce((s, t) => s + (t.retweets || 0), 0);
    const totalReplies  = tweets.reduce((s, t) => s + (t.replies  || 0), 0);
    const totalViews    = tweets.reduce((s, t) => s + (t.views    || 0), 0);

    const avgLikes    = _round(_safeDivide(totalLikes,    count));
    const avgRetweets = _round(_safeDivide(totalRetweets, count));
    const avgReplies  = _round(_safeDivide(totalReplies,  count));
    const avgViews    = _round(_safeDivide(totalViews,    count));

    const followers = profile.followersCount || 1;

    // Engagement rate = (avg likes + avg retweets + avg replies) / followers * 100
    const engagementRate = _round(
      _safeDivide((avgLikes + avgRetweets + avgReplies), followers) * 100
    );

    // Score: engagement rate benchmarks
    // < 0.5%  → low (0–30)
    // 0.5–2%  → average (30–60)
    // 2–5%    → good (60–80)
    // > 5%    → excellent (80–100)
    let score = 0;
    if (engagementRate >= 5)        score = _clamp(80 + (engagementRate - 5) * 2);
    else if (engagementRate >= 2)   score = 60 + ((engagementRate - 2) / 3) * 20;
    else if (engagementRate >= 0.5) score = 30 + ((engagementRate - 0.5) / 1.5) * 30;
    else                            score = (engagementRate / 0.5) * 30;

    return {
      avgLikes,
      avgRetweets,
      avgReplies,
      avgViews,
      engagementRate,
      totalLikes,
      totalRetweets,
      totalReplies,
      tweetCount: count,
      score: _clamp(Math.round(score)),
    };
  }

  /* ─────────────────────────────────────────────────────────
     FOLLOWER ANALYSIS
  ───────────────────────────────────────────────────────── */

  /**
   * Analyze follower/following ratio and audience quality
   * @param {object} profile
   * @returns {object} follower metrics
   */
  function calcFollowerMetrics(profile) {
    const followers = profile.followersCount || 0;
    const following = profile.followingCount || 0;

    const ratio = _round(_safeDivide(followers, following || 1), 2);

    // Ratio score — log curve favoring authority accounts
    let ratioScore = 0;
    if (ratio >= 100)      ratioScore = 100;
    else if (ratio >= 50)  ratioScore = 90 + (ratio - 50) / 50 * 10;
    else if (ratio >= 10)  ratioScore = 70 + (ratio - 10) / 40 * 20;
    else if (ratio >= 3)   ratioScore = 50 + (ratio - 3)  / 7  * 20;
    else if (ratio >= 1)   ratioScore = 30 + (ratio - 1)  / 2  * 20;
    else                   ratioScore = ratio * 30;

    // Audience size score (log scale)
    const audienceScore = _logNorm(followers, 6);

    // Follower bar percentages for visualization
    const total = followers + following;
    const followerPct = total > 0 ? _round((followers / total) * 100) : 50;
    const followingPct = 100 - followerPct;

    // Quality signals
    const isHighRatio    = ratio >= 10;
    const isMassFollower = following > 5000 && ratio < 1;
    const isAuthority    = followers > 100000 && ratio >= 5;
    const isInfluencer   = followers > 10000  && ratio >= 2;
    const isNiche        = followers < 10000  && ratio >= 2;

    return {
      followers,
      following,
      ratio,
      ratioScore:   _clamp(Math.round(ratioScore)),
      audienceScore: _clamp(Math.round(audienceScore)),
      followerPct,
      followingPct,
      isHighRatio,
      isMassFollower,
      isAuthority,
      isInfluencer,
      isNiche,
      tier: _getFollowerTier(followers),
    };
  }

  /**
   * Get audience tier label
   */
  function _getFollowerTier(count) {
    if (count >= 1_000_000) return { label: 'Mega',  emoji: '🌟', color: 'gold'   };
    if (count >= 100_000)   return { label: 'Macro', emoji: '⭐', color: 'purple' };
    if (count >= 10_000)    return { label: 'Mid',   emoji: '💫', color: 'blue'   };
    if (count >= 1_000)     return { label: 'Micro', emoji: '✨', color: 'green'  };
    return                         { label: 'Nano',  emoji: '🔹', color: 'muted'  };
  }

  /* ─────────────────────────────────────────────────────────
     ACTIVITY ANALYSIS
  ───────────────────────────────────────────────────────── */

  /**
   * Analyze posting activity and consistency
   * @param {object} profile
   * @param {array}  tweets
   * @returns {object} activity metrics
   */
  function calcActivity(profile, tweets) {
    const totalTweets = profile.tweetsCount || 0;

    // Account age in days
    let accountAgeDays = 365; // default 1 year
    if (profile.joinedRaw) {
      const joined = new Date(profile.joinedRaw);
      const now    = new Date();
      accountAgeDays = Math.max(1, Math.floor((now - joined) / (1000 * 60 * 60 * 24)));
    }

    const tweetsPerDay  = _round(_safeDivide(totalTweets, accountAgeDays), 2);
    const tweetsPerWeek = _round(tweetsPerDay * 7, 1);

    // Activity score (optimal: 1–5 tweets/day)
    let activityScore = 0;
    if (tweetsPerDay >= 1 && tweetsPerDay <= 5) {
      activityScore = 100;
    } else if (tweetsPerDay > 5) {
      // Over-posting penalty
      activityScore = _clamp(100 - (tweetsPerDay - 5) * 5);
    } else {
      // Under-posting
      activityScore = (tweetsPerDay / 1) * 100;
    }

    // Last active from most recent tweet
    let lastActive   = 'Unknown';
    let daysSinceLast = null;

    if (tweets && tweets.length > 0) {
      const latest = tweets
        .map(t => t.date)
        .filter(Boolean)
        .sort((a, b) => b - a)[0];

      if (latest) {
        daysSinceLast = Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
        lastActive = _formatLastActive(daysSinceLast);
      }
    }

    // Weekly breakdown from recent tweets
    const weeklyBreakdown = _buildWeeklyBreakdown(tweets);

    // Consistency score — penalize long gaps
    let consistencyScore = 100;
    if (daysSinceLast !== null) {
      if (daysSinceLast > 30)     consistencyScore = 20;
      else if (daysSinceLast > 14) consistencyScore = 40;
      else if (daysSinceLast > 7)  consistencyScore = 60;
      else if (daysSinceLast > 3)  consistencyScore = 80;
      else                         consistencyScore = 100;
    }

    return {
      totalTweets,
      accountAgeDays,
      tweetsPerDay,
      tweetsPerWeek,
      activityScore:    _clamp(Math.round(activityScore)),
      consistencyScore: _clamp(Math.round(consistencyScore)),
      lastActive,
      daysSinceLast,
      weeklyBreakdown,
    };
  }

  /**
   * Build last-7-days tweet frequency breakdown
   */
  function _buildWeeklyBreakdown(tweets) {
    const days = [];
    const now  = new Date();

    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const next = new Date(day);
      next.setDate(day.getDate() + 1);

      const label = day.toLocaleDateString('en-US', { weekday: 'short' });
      const count = (tweets || []).filter(t => {
        if (!t.date) return false;
        return t.date >= day && t.date < next;
      }).length;

      days.push({ label, count, date: day });
    }

    return days;
  }

  /**
   * Human-readable last active string
   */
  function _formatLastActive(days) {
    if (days === 0)    return 'Today';
    if (days === 1)    return 'Yesterday';
    if (days <= 7)     return `${days} days ago`;
    if (days <= 30)    return `${Math.floor(days / 7)} weeks ago`;
    if (days <= 365)   return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  /* ─────────────────────────────────────────────────────────
     MASTER IQ SCORE
  ───────────────────────────────────────────────────────── */

  /**
   * Calculate the final weighted IQ score
   * @param {object} engagement  - from calcEngagement()
   * @param {object} followers   - from calcFollowerMetrics()
   * @param {object} activity    - from calcActivity()
   * @returns {object} final score result
   */
  function calcIQScore(engagement, followers, activity) {
    const w = CONFIG.SCORE_WEIGHTS;

    const weighted =
      (engagement.score    * w.ENGAGEMENT) +
      (followers.ratioScore * w.RATIO)     +
      (activity.activityScore * w.ACTIVITY) +
      (followers.audienceScore * w.AUDIENCE);

    const final = _clamp(Math.round(weighted));
    const gradeInfo = _getGrade(final);

    return {
      score:   final,
      grade:   gradeInfo.grade,
      label:   gradeInfo.label,
      color:   gradeInfo.color,
      verdict: _buildVerdict(final, gradeInfo, engagement, followers, activity),
      breakdown: {
        engagement: {
          label:  'Engagement',
          score:  engagement.score,
          weight: w.ENGAGEMENT,
          color:  'blue',
        },
        ratio: {
          label:  'Follower Ratio',
          score:  followers.ratioScore,
          weight: w.RATIO,
          color:  'purple',
        },
        activity: {
          label:  'Activity',
          score:  activity.activityScore,
          weight: w.ACTIVITY,
          color:  'green',
        },
        audience: {
          label:  'Audience Size',
          score:  followers.audienceScore,
          weight: w.AUDIENCE,
          color:  'gold',
        },
      },
    };
  }

  /**
   * Get grade info from score
   */
  function _getGrade(score) {
    return CONFIG.GRADES.find(g => score >= g.min) || CONFIG.GRADES[CONFIG.GRADES.length - 1];
  }

  /**
   * Build a human-readable score verdict
   */
  function _buildVerdict(score, grade, engagement, followers, activity) {
    const name = grade.label;
    const er   = engagement.engagementRate;
    const tier = followers.tier.label;

    const verdicts = {
      S: `An elite ${tier}-tier profile with exceptional engagement (${er}% rate) and strong audience authority. This account operates at the top tier of X influence.`,
      A: `An excellent ${tier}-tier profile demonstrating strong engagement (${er}% rate) and healthy audience metrics. Well above average performance across all dimensions.`,
      B: `A solid ${tier}-tier profile with good engagement (${er}% rate). Performing above average with clear strengths — a few optimizations could push this into elite territory.`,
      C: `An average ${tier}-tier profile with moderate engagement (${er}% rate). There is meaningful room to improve posting consistency, content quality, or audience targeting.`,
      D: `A developing ${tier}-tier profile with low engagement (${er}% rate). Focus on consistent posting, quality content, and genuine community interaction to grow this score significantly.`,
    };

    return verdicts[grade.grade] || verdicts['C'];
  }

  /* ─────────────────────────────────────────────────────────
     INSIGHT GENERATOR
  ───────────────────────────────────────────────────────── */

  /**
   * Generate 5 plain-English AI insights
   * @param {object} profile
   * @param {object} engagement
   * @param {object} followers
   * @param {object} activity
   * @param {object} iqScore
   * @returns {array} insight objects [{icon, title, text, type}]
   */
  function generateInsights(profile, engagement, followers, activity, iqScore) {
    const insights = [];

    // ── Engagement insight ──
    const er = engagement.engagementRate;
    if (er >= 5) {
      insights.push({
        icon: '🔥',
        title: 'Exceptional Engagement Rate',
        text: `With a ${er}% engagement rate, this profile outperforms 95% of accounts at this follower tier. The audience is highly active and responsive.`,
        type: 'positive',
      });
    } else if (er >= 2) {
      insights.push({
        icon: '📈',
        title: 'Strong Engagement Rate',
        text: `A ${er}% engagement rate is well above the industry average of ~0.5%. The content resonates strongly with followers.`,
        type: 'positive',
      });
    } else if (er >= 0.5) {
      insights.push({
        icon: '📊',
        title: 'Average Engagement Rate',
        text: `At ${er}%, engagement is around industry average. Experimenting with more conversational content, threads, or polls could boost interaction.`,
        type: 'neutral',
      });
    } else {
      insights.push({
        icon: '⚠️',
        title: 'Low Engagement Rate',
        text: `A ${er}% engagement rate suggests the audience may not be fully aligned with the content. Consider auditing content strategy and posting times.`,
        type: 'warning',
      });
    }

    // ── Follower ratio insight ──
    const ratio = followers.ratio;
    if (followers.isAuthority) {
      insights.push({
        icon: '👑',
        title: 'Authority Account',
        text: `With a ${ratio}:1 follower-to-following ratio, this is a recognized authority account. People follow because of genuine influence, not reciprocity.`,
        type: 'positive',
      });
    } else if (followers.isHighRatio) {
      insights.push({
        icon: '⭐',
        title: 'Excellent Follow Ratio',
        text: `A ${ratio}:1 ratio signals strong organic authority. This profile attracts followers without mass-following tactics.`,
        type: 'positive',
      });
    } else if (followers.isMassFollower) {
      insights.push({
        icon: '🔄',
        title: 'Mass Following Detected',
        text: `Following ${_fmt(followers.following)} accounts with a ratio below 1 suggests a follow-for-follow strategy. This can dilute perceived authority.`,
        type: 'warning',
      });
    } else {
      insights.push({
        icon: '👥',
        title: 'Balanced Audience Growth',
        text: `A ${ratio}:1 follower ratio indicates a growing profile. Focus on organic content to steadily improve this metric over time.`,
        type: 'neutral',
      });
    }

    // ── Activity insight ──
    const tpw = activity.tweetsPerWeek;
    if (activity.activityScore >= 80) {
      insights.push({
        icon: '⚡',
        title: 'Consistent Posting Cadence',
        text: `Averaging ${tpw} tweets per week keeps this profile visible in the algorithm. Consistent posting is one of the strongest growth signals on X.`,
        type: 'positive',
      });
    } else if (tpw < 1) {
      insights.push({
        icon: '😴',
        title: 'Low Posting Frequency',
        text: `Less than 1 tweet per week makes it difficult to maintain algorithmic visibility. Even 3–5 quality posts per week can significantly boost reach.`,
        type: 'warning',
      });
    } else {
      insights.push({
        icon: '📅',
        title: 'Moderate Activity Level',
        text: `Posting ${tpw} times per week is a reasonable cadence. Increasing to a daily schedule while maintaining quality could meaningfully grow reach.`,
        type: 'neutral',
      });
    }

    // ── Audience size insight ──
    const tier = followers.tier;
    insights.push({
      icon: tier.emoji,
      title: `${tier.label}-Tier Account`,
      text: `With ${_fmt(followers.followers)} followers, this is a ${tier.label.toLowerCase()}-tier account. ${_getTierAdvice(tier.label, engagement.engagementRate)}`,
      type: followers.followers > 1000 ? 'positive' : 'neutral',
    });

    // ── Score-based insight ──
    const score = iqScore.score;
    if (score >= 75) {
      insights.push({
        icon: '🏆',
        title: 'Top-Tier IQ Profile',
        text: `An IQ Score of ${score} places this profile in the top tier of X accounts. The combination of engagement, consistency, and audience quality is impressive.`,
        type: 'positive',
      });
    } else if (score >= 50) {
      insights.push({
        icon: '💡',
        title: 'Strong Growth Potential',
        text: `An IQ Score of ${score} shows a solid foundation. The highest-leverage improvement would be in ${_weakestDimension(iqScore.breakdown)} — focus there first.`,
        type: 'neutral',
      });
    } else {
      insights.push({
        icon: '🚀',
        title: 'High Room for Growth',
        text: `An IQ Score of ${score} means there is significant opportunity ahead. Start with ${_weakestDimension(iqScore.breakdown)} — it has the biggest weighted impact on your score.`,
        type: 'warning',
      });
    }

    return insights.slice(0, 5);
  }

  /**
   * Get advice string based on tier
   */
  function _getTierAdvice(tier, er) {
    const map = {
      Mega:  'At this scale, even a small engagement rate improvement has massive reach implications.',
      Macro: 'Brand partnerships and monetization opportunities are highly accessible at this level.',
      Mid:   'This is the sweet spot where content quality drives exponential growth.',
      Micro: `A ${er}% engagement rate at this size is highly attractive to niche brands and communities.`,
      Nano:  'Focus on consistency and community engagement — this is where loyal audiences are built.',
    };
    return map[tier] || map['Nano'];
  }

  /**
   * Find the weakest scoring dimension
   */
  function _weakestDimension(breakdown) {
    const dims = Object.values(breakdown);
    const weakest = dims.reduce((a, b) => a.score < b.score ? a : b);
    return weakest.label.toLowerCase();
  }

  /**
   * Format large numbers
   */
  function _fmt(n) {
    if (n >= 1_000_000) return `${_round(n / 1_000_000, 1)}M`;
    if (n >= 1_000)     return `${_round(n / 1_000, 1)}K`;
    return String(n);
  }

  /* ─────────────────────────────────────────────────────────
     MAIN ENTRY — analyze everything
  ───────────────────────────────────────────────────────── */

  /**
   * Run full analysis on profile + tweets
   * @param {object} profile - normalized profile
   * @param {array}  tweets  - normalized tweets
   * @returns {object} complete analysis result
   */
  function analyze(profile, tweets) {
    const engagement = calcEngagement(profile, tweets);
    const followers  = calcFollowerMetrics(profile);
    const activity   = calcActivity(profile, tweets);
    const iqScore    = calcIQScore(engagement, followers, activity);
    const insights   = generateInsights(profile, engagement, followers, activity, iqScore);

    return {
      profile,
      tweets,
      engagement,
      followers,
      activity,
      iqScore,
      insights,
    };
  }

  /* ─────────────────────────────────────────────────────────
     EXPOSE
  ───────────────────────────────────────────────────────── */
  return {
    analyze,
    calcEngagement,
    calcFollowerMetrics,
    calcActivity,
    calcIQScore,
    generateInsights,
    window.SCORE_ENGINE = SCORE_ENGINE;
  };

})();