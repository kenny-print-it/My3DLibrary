export type StartupDuration = "quick" | "standard" | "leisurely";

export type StartupPreferences = {
  duration: StartupDuration;
  soundEnabled: boolean;
};

export const STARTUP_PREFERENCES_KEY = "my3dlibrary_startup_preferences";

export const DEFAULT_STARTUP_PREFERENCES: StartupPreferences = {
  duration: "standard",
  soundEnabled: false,
};

export const STARTUP_DURATION_OPTIONS: Array<{ value: StartupDuration; label: string; description: string }> = [
  { value: "quick", label: "Quick", description: "A short hello" },
  { value: "standard", label: "Standard", description: "About one second" },
  { value: "leisurely", label: "Leisurely", description: "About a second and a half" },
];

export function parseStartupPreferences(raw: string | null): StartupPreferences {
  if (!raw) return DEFAULT_STARTUP_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<StartupPreferences>;
    return {
      duration: ["quick", "standard", "leisurely"].includes(parsed.duration || "")
        ? parsed.duration as StartupDuration
        : DEFAULT_STARTUP_PREFERENCES.duration,
      soundEnabled: parsed.soundEnabled === true,
    };
  } catch {
    return DEFAULT_STARTUP_PREFERENCES;
  }
}

export function loadStartupPreferences(): StartupPreferences {
  try {
    return parseStartupPreferences(localStorage.getItem(STARTUP_PREFERENCES_KEY));
  } catch {
    return DEFAULT_STARTUP_PREFERENCES;
  }
}

export function saveStartupPreferences(preferences: StartupPreferences) {
  try {
    localStorage.setItem(STARTUP_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Defaults remain available in restricted local-storage environments.
  }
}
