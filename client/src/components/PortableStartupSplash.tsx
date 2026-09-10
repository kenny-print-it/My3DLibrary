import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { loadStartupPreferences } from "@/lib/startupPreferences";

const DURATION_MS = { quick: 550, standard: 1000, leisurely: 1500 } as const;

function playChime() {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const context = new AudioContextCtor();
    const now = context.currentTime;
    [523.25, 659.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.04, now + index * 0.09 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.18);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.2);
    });
    window.setTimeout(() => void context.close(), 500);
  } catch {
    // Audio is optional; browsers may block startup sound until user interaction.
  }
}

export function PortableStartupSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const preferences = loadStartupPreferences();
    if (preferences.soundEnabled) playChime();
    const duration = DURATION_MS[preferences.duration];
    const fadeTimer = window.setTimeout(() => setFading(true), Math.max(0, duration - 220));
    const dismissTimer = window.setTimeout(() => setVisible(false), duration);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(dismissTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Starting My3DLibrary"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-200 ${fading ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/my3dlibrary-logo.png" alt="My3DLibrary" className="h-28 w-28 rounded-2xl object-contain shadow-2xl sm:h-32 sm:w-32" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My3DLibrary</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your 3D print collection</p>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      </div>
    </div>
  );
}
