window.addEventListener('DOMContentLoaded', () => {

  UI.initPlaceholderCycle();
  UI.initSidebarNav();

  const searchBtn = document.getElementById('search-btn');
  const input = document.getElementById('search-input');

  if (!searchBtn || !input) {
    console.warn('Search elements missing');
    return;
  }

  searchBtn.addEventListener('click', async () => {

    const username = input.value.trim().replace('@', '');

    if (!username) {
      UI.showSearchError('Please enter a username');
      return;
    }

    try {

      UI.showSearchError('');
      UI.setSearchLoading(true);
      UI.resetDashboard();
      UI.showDashboard();

      const profile = await API.fetchProfile(username);

      const iq = SCORE_ENGINE.generateIQ(profile);

      UI.renderProfileHeader(profile);
      UI.renderSidebarProfile(profile);
      UI.renderScoreCard(iq);

      UI.showToast('Profile analyzed successfully', 'success');

      HELPERS.saveRecent(username);
      UI.renderRecentSearches(HELPERS.getRecent());

    } catch (error) {

      console.error(error);

      UI.renderErrorState(
        'GENERIC',
        error.message || 'Something went wrong'
      );

      UI.showToast('Failed to analyze profile', 'error');

    } finally {

      UI.setSearchLoading(false);

    }
  });

});