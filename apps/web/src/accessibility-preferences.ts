export const TEXT_SIZE_STORAGE_KEY = "tai:text-size";

export const textSizes = ["standard", "large", "largest"] as const;
export type TextSize = (typeof textSizes)[number];

export function isTextSize(value: unknown): value is TextSize {
  return typeof value === "string" && textSizes.includes(value as TextSize);
}

export function loadTextSize(storage: Pick<Storage, "getItem">): TextSize {
  try {
    const value = storage.getItem(TEXT_SIZE_STORAGE_KEY);
    return isTextSize(value) ? value : "standard";
  } catch {
    return "standard";
  }
}

export function applyTextSize(size: TextSize) {
  document.documentElement.dataset.textSize = size;
}

type StorageProvider = () => Pick<Storage, "getItem" | "setItem">;

const browserStorage: StorageProvider = () => window.localStorage;

export function loadTextSizeFromProvider(
  storage: StorageProvider = browserStorage,
): TextSize {
  try {
    return loadTextSize(storage());
  } catch {
    return "standard";
  }
}

export function initializeTextSize(storage: StorageProvider = browserStorage) {
  const size = loadTextSizeFromProvider(storage);
  applyTextSize(size);
  return size;
}

export function saveTextSize(
  size: TextSize,
  storage: StorageProvider = browserStorage,
) {
  applyTextSize(size);
  try {
    storage().setItem(TEXT_SIZE_STORAGE_KEY, size);
    return "";
  } catch {
    return "Text size is applied for this tab but could not be saved for your next visit.";
  }
}
