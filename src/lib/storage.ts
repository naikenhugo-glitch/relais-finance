"use client";

import { useCallback, useEffect, useState } from "react";
import { createEmptyState, STORAGE_KEY } from "./defaults";
import { normalizeState } from "./orders";
import type { AppState, Settings } from "./types";

function loadState(): AppState {
  if (typeof window === "undefined") return createEmptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    return normalizeState(JSON.parse(raw), createEmptyState());
  } catch {
    return createEmptyState();
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(createEmptyState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const update = useCallback((updater: (prev: AppState) => AppState) => {
    setState((prev) => updater(prev));
  }, []);

  const resetAll = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Effacer toutes les données (achats, ventes, vendeurs) ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    setState(createEmptyState());
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relais-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = normalizeState(
          JSON.parse(String(reader.result)),
          createEmptyState(),
        );
        setState(parsed);
      } catch {
        window.alert("Impossible de lire ce fichier.");
      }
    };
    reader.readAsText(file);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  return {
    state,
    ready,
    update,
    resetAll,
    exportJson,
    importJson,
    updateSettings,
    setState,
  };
}
