/**
 * Node built-in test runner sanity checks for @amoeba/image-url.
 * Run with `npm test` (uses `node --test dist/test.js` after compile).
 *
 * Not a full test suite — just enough to catch silent shape regressions.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  publicImageUrl,
  renderImageUrl,
  withRenderParams,
  isCanonicalImageUrl,
  parseImageUrl,
  canonicalizeImageUrl,
  IMAGE_CDN_BASE,
  PLACEHOLDER_IMAGE_URL,
} from './index';

describe('publicImageUrl', () => {
  it('builds the canonical shape', () => {
    assert.equal(
      publicImageUrl('product-images', 'chair/lemon/hero.webp'),
      `${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/chair/lemon/hero.webp`
    );
  });

  it('falls back to default bucket when bucket is null', () => {
    assert.equal(
      publicImageUrl(null, 'a/b.webp'),
      `${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a/b.webp`
    );
  });

  it('returns placeholder when path is missing', () => {
    assert.equal(publicImageUrl('product-images', null), PLACEHOLDER_IMAGE_URL);
    assert.equal(publicImageUrl('product-images', ''), PLACEHOLDER_IMAGE_URL);
  });

  it('strips a leading slash from path', () => {
    assert.equal(
      publicImageUrl('product-images', '/a/b.webp'),
      `${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a/b.webp`
    );
  });
});

describe('renderImageUrl', () => {
  it('omits query when no options provided', () => {
    assert.equal(
      renderImageUrl('product-images', 'a.webp'),
      `${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp`
    );
  });

  it('serializes width/quality/format', () => {
    assert.equal(
      renderImageUrl('product-images', 'a.webp', { width: 640, quality: 82, format: 'origin' }),
      `${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=640&quality=82&format=origin`
    );
  });

  it('rounds fractional widths', () => {
    assert.equal(
      renderImageUrl('product-images', 'a.webp', { width: 640.7 }),
      `${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=641`
    );
  });
});

describe('withRenderParams', () => {
  it('upgrades /object/public to /render/image/public when sizing requested', () => {
    const input = `${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`;
    assert.equal(
      withRenderParams(input, { width: 640, quality: 82 }),
      `${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=640&quality=82`
    );
  });

  it('does not upgrade when no sizing requested', () => {
    const input = `${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`;
    assert.equal(withRenderParams(input, {}), input);
  });

  it('preserves existing query params', () => {
    const input = `${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=320`;
    assert.equal(
      withRenderParams(input, { width: 640, quality: 82 }),
      `${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=320&quality=82`
    );
  });
});

describe('isCanonicalImageUrl', () => {
  it('accepts canonical object + render URLs', () => {
    assert.equal(
      isCanonicalImageUrl(`${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`),
      true
    );
    assert.equal(
      isCanonicalImageUrl(`${IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=640`),
      true
    );
  });

  it('rejects legacy and broken shapes', () => {
    assert.equal(
      isCanonicalImageUrl('https://supabase.amoeba.works/storage/v1/object/public/product-images/a.webp'),
      false
    );
    assert.equal(
      isCanonicalImageUrl('https://droplet.amoeba.works/supabase/storage/v1/object/public/product-images/a.webp'),
      false
    );
    assert.equal(
      isCanonicalImageUrl(`${IMAGE_CDN_BASE}/supabase/storage/v1/object/public/product-images/a.webp`),
      false
    );
  });

  it('rejects null/empty/unrelated', () => {
    assert.equal(isCanonicalImageUrl(null), false);
    assert.equal(isCanonicalImageUrl(''), false);
    assert.equal(isCanonicalImageUrl('https://example.com/image.jpg'), false);
  });
});

describe('parseImageUrl', () => {
  it('parses canonical URLs', () => {
    assert.deepEqual(
      parseImageUrl(`${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a/b.webp`),
      { bucket: 'product-images', path: 'a/b.webp' }
    );
  });

  it('parses supabase.amoeba.works URLs', () => {
    assert.deepEqual(
      parseImageUrl('https://supabase.amoeba.works/storage/v1/render/image/public/product-images/a.webp?width=640'),
      { bucket: 'product-images', path: 'a.webp' }
    );
  });

  it('parses legacy droplet-proxy URLs', () => {
    assert.deepEqual(
      parseImageUrl('https://droplet.amoeba.works/supabase/storage/v1/object/public/product-images/a.webp'),
      { bucket: 'product-images', path: 'a.webp' }
    );
  });

  it('parses broken /supabase/ prefix on images.amoeba.works', () => {
    assert.deepEqual(
      parseImageUrl(`${IMAGE_CDN_BASE}/supabase/storage/v1/object/public/product-images/a.webp`),
      { bucket: 'product-images', path: 'a.webp' }
    );
  });

  it('returns null for non-storage URLs', () => {
    assert.equal(parseImageUrl('https://example.com/image.jpg'), null);
    assert.equal(parseImageUrl(''), null);
    assert.equal(parseImageUrl(null), null);
  });
});

describe('canonicalizeImageUrl', () => {
  it('rewrites any known shape to canonical', () => {
    const expected = `${IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`;
    assert.equal(
      canonicalizeImageUrl('https://supabase.amoeba.works/storage/v1/object/public/product-images/a.webp'),
      expected
    );
    assert.equal(
      canonicalizeImageUrl('https://droplet.amoeba.works/supabase/storage/v1/render/image/public/product-images/a.webp?width=640'),
      expected
    );
    assert.equal(canonicalizeImageUrl(expected), expected);
  });

  it('returns null for unrecognised URLs', () => {
    assert.equal(canonicalizeImageUrl('https://example.com/image.jpg'), null);
  });
});
