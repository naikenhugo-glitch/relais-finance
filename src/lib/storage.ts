"use client";

import { useCallback, useEffect, useState } from "react";
import { createEmptyState, STORAGE_KEY } from "./defaults";
import type { AppState, Settings } from "./types";

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const v = value as AppState;
  return (
    v.version === 1 &&
    Array.isArray(v.purchases) &&
    Array.isArray(v.sellers) &&
    Array.isArray(v.allocations) &&
    Array.isArray(v.sales) &&
    !!v.settings
  );
}

function loadState(): AppState {
  if (typeof window === "undefined") return createEmptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed: unknown = JSON.parse(raw);
    if (!isAppState(parsed)) return createEmptyState();
    return {
      ...parsed,
      settings: {
        ...createEmptyState().settings,
        ...parsed.settings,
        defaultBuyPrices: {
          ...createEmptyState().settings.defaultBuyPrices,
          ...parsed.settings.defaultBuyPrices,
        },
        defaultSellPrices: {
          ...createEmptyState().settings.defaultSellPrices,
          ...parsed.settings.defaultSellPrices,
        },
        commissionTiers:
          parsed.settings.commissionTiers?.length > 0
            ? parsed.settings.commissionTiers
            : createEmptyState().settings.commissionTiers,
      },
    };
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
        const parsed: unknown = JSON.parse(String(reader.result));
        if (!isAppState(parsed)) {
          window.alert("Fichier invalide.");
          return;
        }
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
