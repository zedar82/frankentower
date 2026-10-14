import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AssetLoadError,
  assetStatus,
  loadJsonAsset,
  retryFailedAssets,
} from '../src/art/asset-loader';

test('JSON assets share their initial request and retry only the failed asset URL', async () => {
  const url = `https://assets.example.test/geometry-${crypto.randomUUID()}.json`;
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const requestedUrl = String(input);
    requests.push(requestedUrl);
    if (requests.length === 1)
      return new Response('unavailable', { status: 503 });
    return Response.json({ count: 3 });
  }) as typeof fetch;
  try {
    await assert.rejects(loadJsonAsset(url, 'test geometry'), AssetLoadError);
    assert.equal(assetStatus(url), 'error');
    await retryFailedAssets();
    assert.equal(assetStatus(url), 'ready');
    assert.deepEqual(await loadJsonAsset<{ count: number }>(url, 'test geometry'), { count: 3 });
    assert.equal(requests.length, 2);
    assert.equal(requests[0], url);
    assert.match(requests[1], /[?&]asset-retry=1$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
