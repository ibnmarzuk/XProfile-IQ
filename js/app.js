window.addEventListener('DOMContentLoaded', () => {

  UI.initPlaceholderCycle();
  UI.initSidebarNav();
  UI.initRecentSearchClicks();

  const searchBtn = document.getElementById('search-btn');
  const input = document.getElementById('search-input');
  const backBtn = document.getElementById('back-btn');

  if (!searchBtn || !input) {
    console.warn('Search elements missing');
    return;
  }

  // Main search on button click
  searchBtn.addEventListener('click', () => performSearch(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch(input.value);
  });

  // Mini search in dashboard
  const searchBtnMini = document.getElementById('search-btn-mini');
  const inputMini = document.getElementById('search-input-mini');
  if (searchBtnMini && inputMini) {
    searchBtnMini.addEventListener('click', () => performSearch(inputMini.value));
    inputMini.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch(inputMini.value);
    });
  }

  // Back button
  if (backBtn) {
    backBtn.addEventListener('click', () => UI.showSearchPage());
  }

  async function performSearch(username) {
    const clean = username.trim().replace('@', '');

    if (!clean) {
      UI.showSearchError('Please enter a username');
      return;
    }

    try {
      UI.showSearchError('');
      UI.setSearchLoading(true);
      UI.resetDashboard();
      UI.showDashboard();

      const data = await API.fetchAll(clean);
      const profile = data.profile;
      const tweets = data.tweets || [];

      const iq = SCORE_ENGINE.generateIQ(profile, tweets);

      // Render sections
      UI.renderProfileHeader(profile);
      UI.renderSidebarProfile(profile);
      UI.renderScoreCard(iq);

      // Engagement metrics
      const metrics = SCORE_ENGINE.generateMetrics(profile, tweets);
      UI.renderMetrics(metrics);

      // Follower intelligence
      const followers = SCORE_ENGINE.generateFollowerIntelligence(profile);
      UI.renderFollowerCards(followers);

      // Activity
      const activity = SCORE_ENGINE.generateActivity(profile, tweets);
      UI.renderActivity(activity, tweets);

      // Insights
      const insights = SCORE_ENGINE.generateInsights(profile, tweets, iq, followers);
      UI.renderInsights(insights);

      UI.showToast('✅ Profile analyzed successfully', 'success');

      API.addRecentSearch(clean);
      UI.renderRecentSearches(API.getRecentSearches());

    } catch (error) {
      console.error('❌ Search Error:', error);

      let code = 'GENERIC';
      let message = error.message || 'Something went wrong';

      if (error.code) code = error.code;
      if (error.code === 'NOT_FOUND') message = 'Profile not found. Check the username.';
      if (error.code === 'RATE_LIMIT') message = 'API rate limit reached. Wait a moment.';
      if (error.code === 'NETWORK') message = 'Network error. Check your connection.';

      UI.renderErrorState(code, message);
      UI.showToast('❌ Failed to analyze profile', 'error');

    } finally {
      UI.setSearchLoading(false);
    }
  }

});
