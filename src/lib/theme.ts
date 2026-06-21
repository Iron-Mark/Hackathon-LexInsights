export const THEME_STORAGE_KEY = 'lexinsight-theme'

export const themeInitScript = `
(function () {
  try {
    var storageKey = '${THEME_STORAGE_KEY}';
    var storedPreference = window.localStorage.getItem(storageKey);
    var useDark = storedPreference === 'dark' || (
      storedPreference !== 'light' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    var theme = useDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', useDark);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {}
})();
`
