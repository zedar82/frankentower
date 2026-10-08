// Development-only adapter. Vite removes this import from all hosted builds.
export const read = (key: string) => localStorage.getItem(key);
export const write = (key: string, value: string) => localStorage.setItem(key, value);
