export type AssetStatus = 'loading' | 'ready' | 'error';
type AssetRecord = {
  url: string;
  name: string;
  kind: 'image' | 'json';
  status: AssetStatus;
  error?: unknown;
  attempt: number;
  promise: Promise<void>;
  retry: () => Promise<void>;
  image?: HTMLImageElement;
  value?: unknown;
  validate?: (value: unknown) => void;
};

const assets = new Map<string, AssetRecord>();
const listeners = new Set<() => void>();
function notify() {
  for (const listener of listeners) listener();
}
function retryUrl(url: string, attempt: number) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}asset-retry=${attempt}`;
}

export class AssetLoadError extends Error {
  constructor(
    readonly url: string,
    readonly assetName: string,
    options?: ErrorOptions,
  ) {
    super(`Unable to load required asset: ${assetName}`, options);
    this.name = 'AssetLoadError';
  }
}

function setStatus(record: AssetRecord, status: AssetStatus, error?: unknown) {
  record.status = status;
  record.error = error;
  notify();
}

function startImage(record: AssetRecord) {
  record.status = 'loading';
  record.error = undefined;
  const image = record.image!;
  record.promise = new Promise<void>((resolve) => {
    let settled = false;
    const finish = (ready: boolean, error?: unknown) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      if (ready) setStatus(record, 'ready');
      else {
        const failure = error ?? new Error(`Optional image failed: ${record.name}`);
        setStatus(record, 'error', failure);
        console.warn(`Optional art asset failed to load: ${record.name}.`);
      }
      resolve();
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = record.attempt ? retryUrl(record.url, record.attempt) : record.url;
    void image.decode().then(
      () => finish(true),
      (error: unknown) => finish(false, error),
    );
  });
  notify();
  return record.promise;
}

function startJson(record: AssetRecord, cacheBust: boolean) {
  record.status = 'loading';
  record.error = undefined;
  const url = cacheBust ? retryUrl(record.url, record.attempt) : record.url;
  record.promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<unknown>;
    })
    .then((value) => {
      record.validate?.(value);
      record.value = value;
      setStatus(record, 'ready');
    })
    .catch((error: unknown) => {
      setStatus(record, 'error', error);
      throw new AssetLoadError(record.url, record.name, { cause: error });
    });
  notify();
  return record.promise;
}

export function requestImageAsset(url: string, name: string): HTMLImageElement {
  let record = assets.get(url);
  if (record) {
    if (record.kind !== 'image') throw new Error(`Asset type mismatch for ${url}.`);
    return record.image!;
  }
  const image = new Image();
  record = {
    url,
    name,
    kind: 'image',
    status: 'loading',
    attempt: 0,
    promise: Promise.resolve(),
    image,
    retry: async () => {
      record!.attempt++;
      await startImage(record!);
    },
  };
  assets.set(url, record);
  void startImage(record);
  return image;
}

export function imageAssetReady(url: string): Promise<void> {
  const record = assets.get(url);
  return record?.kind === 'image' ? record.promise : Promise.resolve();
}

export function isImageAssetReady(url: string): boolean {
  const record = assets.get(url);
  return record?.kind === 'image' && record.status === 'ready';
}

export function loadJsonAsset<T>(
  url: string,
  name: string,
  validate?: (value: unknown) => asserts value is T,
): Promise<T> {
  const existing = assets.get(url);
  if (existing) {
    if (existing.kind !== 'json') throw new Error(`Asset type mismatch for ${url}.`);
    return existing.promise.then(() => {
      if (existing.status !== 'ready') throw new AssetLoadError(url, name, { cause: existing.error });
      return existing.value as T;
    });
  }
  const record: AssetRecord = {
    url,
    name,
    kind: 'json',
    status: 'loading',
    attempt: 0,
    promise: Promise.resolve(),
    retry: async () => {
      record.attempt++;
      await startJson(record, true);
    },
  };
  record.validate = validate;
  assets.set(url, record);
  record.promise = startJson(record, false);
  return record.promise.then(() => record.value as T);
}

export function assetStatus(url: string): AssetStatus | undefined {
  return assets.get(url)?.status;
}

export function subscribeAssets(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function retryFailedAssets() {
  const failed = [...assets.values()].filter((asset) => asset.status === 'error');
  await Promise.allSettled(failed.map((asset) => asset.retry()));
  const stillFailed = [...assets.values()].filter((asset) => asset.status === 'error');
  if (stillFailed.length)
    throw new AggregateError(
      stillFailed.map((asset) => new AssetLoadError(asset.url, asset.name, { cause: asset.error })),
      `Could not reload ${stillFailed.map((asset) => asset.name).join(', ')}.`,
    );
}
