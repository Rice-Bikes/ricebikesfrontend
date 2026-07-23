export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function currentDomTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export const themeState = $state<{ value: Theme }>({
  value: currentDomTheme(),
});

export function toggleTheme() {
  const next: Theme = themeState.value === "dark" ? "light" : "dark";
  themeState.value = next;
  document.documentElement.dataset.theme = next;
  localStorage.setItem(STORAGE_KEY, next);
}
