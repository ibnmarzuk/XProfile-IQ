const HELPERS = (() => {

  function saveRecent(handle) {
    const existing = JSON.parse(localStorage.getItem('xp_recent')) || [];

    const updated = [handle, ...existing.filter(h => h !== handle)].slice(0, 5);

    localStorage.setItem('xp_recent', JSON.stringify(updated));
  }

  function getRecent() {
    return JSON.parse(localStorage.getItem('xp_recent')) || [];
  }

  return {
    saveRecent,
    getRecent,
  };

})();