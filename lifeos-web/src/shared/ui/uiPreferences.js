export const THEME_MOODS = ["calm", "warm", "focus", "pink", "purple"];
export const DENSITY_MODES = ["comfortable", "compact"];

const KEYS = {
  themeMood: "lifeos_pref_theme_mood",
  density: "lifeos_pref_density",
};

function clampThemeMood(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "love") return "pink";
  if (normalized === "dream") return "purple";
  return THEME_MOODS.includes(normalized) ? normalized : "calm";
}

function clampDensity(value) {
  return DENSITY_MODES.includes(value) ? value : "comfortable";
}

export function loadUiPreferences() {
  if (typeof window === "undefined") {
    return { themeMood: "calm", density: "comfortable" };
  }
  const themeMood = clampThemeMood(localStorage.getItem(KEYS.themeMood));
  const density = clampDensity(localStorage.getItem(KEYS.density));
  return { themeMood, density };
}

export function applyUiPreferences({ themeMood, density }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-lifeos-theme", clampThemeMood(themeMood));
  root.setAttribute("data-lifeos-density", clampDensity(density));
}

export function saveUiPreferences({ themeMood, density }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.themeMood, clampThemeMood(themeMood));
  localStorage.setItem(KEYS.density, clampDensity(density));
  window.dispatchEvent(new Event("lifeos-ui-prefs-changed"));
}
