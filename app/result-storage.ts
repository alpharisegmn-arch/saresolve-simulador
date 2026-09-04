import type { ComparisonResult } from "./finance";

const STORAGE_KEY = "saresolve:simulation-result";

type StoredSimulationResult = {
  version: 1;
  savedAt: string;
  result: ComparisonResult;
};

export function saveSimulationResult(result: ComparisonResult) {
  const stored: StoredSimulationResult = {
    version: 1,
    savedAt: new Date().toISOString(),
    result,
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function loadSimulationResult(): ComparisonResult | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const stored = JSON.parse(raw) as Partial<StoredSimulationResult>;
    const result = stored.result;
    if (
      stored.version !== 1 ||
      !result ||
      (result.creditType !== "property" && result.creditType !== "vehicle") ||
      typeof result.creditValue !== "number" ||
      typeof result.idealInstallment !== "number" ||
      !result.consortium ||
      !result.financing ||
      !result.comparison
    ) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}
