(() => {
  const storageKey = 'broken-fm.photosensitivity-warning.dismissed';
  window.BROKEN_FM_PHOTOSENSITIVITY_KEY = storageKey;
  try {
    if (window.localStorage.getItem(storageKey) === 'true') {
      document.documentElement.dataset.photosensitivityAccepted = 'true';
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts. In that case,
    // keep showing the warning on every launch.
  }
})();
