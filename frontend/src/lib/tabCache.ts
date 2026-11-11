const memory = new Map<string, unknown>();

export function takeCache<T>(key: string): T | undefined {
  return memory.get(key) as T | undefined;
}

export function putCache<T>(key: string, value: T) {
  memory.set(key, value);
}

export function clearTabCache() {
  memory.clear();
}
