"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Node built-in test runner sanity checks for @amoeba/image-url.
 * Run with `npm test` (uses `node --test dist/test.js` after compile).
 *
 * Not a full test suite — just enough to catch silent shape regressions.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_1 = require("./index");
(0, node_test_1.describe)('publicImageUrl', () => {
    (0, node_test_1.it)('builds the canonical shape', () => {
        strict_1.default.equal((0, index_1.publicImageUrl)('product-images', 'chair/lemon/hero.webp'), `${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/chair/lemon/hero.webp`);
    });
    (0, node_test_1.it)('falls back to default bucket when bucket is null', () => {
        strict_1.default.equal((0, index_1.publicImageUrl)(null, 'a/b.webp'), `${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a/b.webp`);
    });
    (0, node_test_1.it)('returns placeholder when path is missing', () => {
        strict_1.default.equal((0, index_1.publicImageUrl)('product-images', null), index_1.PLACEHOLDER_IMAGE_URL);
        strict_1.default.equal((0, index_1.publicImageUrl)('product-images', ''), index_1.PLACEHOLDER_IMAGE_URL);
    });
    (0, node_test_1.it)('strips a leading slash from path', () => {
        strict_1.default.equal((0, index_1.publicImageUrl)('product-images', '/a/b.webp'), `${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a/b.webp`);
    });
});
(0, node_test_1.describe)('renderImageUrl', () => {
    (0, node_test_1.it)('omits query when no options provided', () => {
        strict_1.default.equal((0, index_1.renderImageUrl)('product-images', 'a.webp'), `${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp`);
    });
    (0, node_test_1.it)('serializes width/quality/format', () => {
        strict_1.default.equal((0, index_1.renderImageUrl)('product-images', 'a.webp', { width: 640, quality: 82, format: 'origin' }), `${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=640&quality=82&format=origin`);
    });
    (0, node_test_1.it)('rounds fractional widths', () => {
        strict_1.default.equal((0, index_1.renderImageUrl)('product-images', 'a.webp', { width: 640.7 }), `${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=641`);
    });
});
(0, node_test_1.describe)('withRenderParams', () => {
    (0, node_test_1.it)('upgrades /object/public to /render/image/public when sizing requested', () => {
        const input = `${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`;
        strict_1.default.equal((0, index_1.withRenderParams)(input, { width: 640, quality: 82 }), `${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=640&quality=82`);
    });
    (0, node_test_1.it)('does not upgrade when no sizing requested', () => {
        const input = `${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`;
        strict_1.default.equal((0, index_1.withRenderParams)(input, {}), input);
    });
    (0, node_test_1.it)('preserves existing query params', () => {
        const input = `${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=320`;
        strict_1.default.equal((0, index_1.withRenderParams)(input, { width: 640, quality: 82 }), `${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=320&quality=82`);
    });
});
(0, node_test_1.describe)('isCanonicalImageUrl', () => {
    (0, node_test_1.it)('accepts canonical object + render URLs', () => {
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)(`${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`), true);
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)(`${index_1.IMAGE_CDN_BASE}/storage/v1/render/image/public/product-images/a.webp?width=640`), true);
    });
    (0, node_test_1.it)('rejects legacy and broken shapes', () => {
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)('https://supabase.amoeba.works/storage/v1/object/public/product-images/a.webp'), false);
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)('https://droplet.amoeba.works/supabase/storage/v1/object/public/product-images/a.webp'), false);
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)(`${index_1.IMAGE_CDN_BASE}/supabase/storage/v1/object/public/product-images/a.webp`), false);
    });
    (0, node_test_1.it)('rejects null/empty/unrelated', () => {
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)(null), false);
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)(''), false);
        strict_1.default.equal((0, index_1.isCanonicalImageUrl)('https://example.com/image.jpg'), false);
    });
});
(0, node_test_1.describe)('parseImageUrl', () => {
    (0, node_test_1.it)('parses canonical URLs', () => {
        strict_1.default.deepEqual((0, index_1.parseImageUrl)(`${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a/b.webp`), { bucket: 'product-images', path: 'a/b.webp' });
    });
    (0, node_test_1.it)('parses supabase.amoeba.works URLs', () => {
        strict_1.default.deepEqual((0, index_1.parseImageUrl)('https://supabase.amoeba.works/storage/v1/render/image/public/product-images/a.webp?width=640'), { bucket: 'product-images', path: 'a.webp' });
    });
    (0, node_test_1.it)('parses legacy droplet-proxy URLs', () => {
        strict_1.default.deepEqual((0, index_1.parseImageUrl)('https://droplet.amoeba.works/supabase/storage/v1/object/public/product-images/a.webp'), { bucket: 'product-images', path: 'a.webp' });
    });
    (0, node_test_1.it)('parses broken /supabase/ prefix on images.amoeba.works', () => {
        strict_1.default.deepEqual((0, index_1.parseImageUrl)(`${index_1.IMAGE_CDN_BASE}/supabase/storage/v1/object/public/product-images/a.webp`), { bucket: 'product-images', path: 'a.webp' });
    });
    (0, node_test_1.it)('returns null for non-storage URLs', () => {
        strict_1.default.equal((0, index_1.parseImageUrl)('https://example.com/image.jpg'), null);
        strict_1.default.equal((0, index_1.parseImageUrl)(''), null);
        strict_1.default.equal((0, index_1.parseImageUrl)(null), null);
    });
});
(0, node_test_1.describe)('canonicalizeImageUrl', () => {
    (0, node_test_1.it)('rewrites any known shape to canonical', () => {
        const expected = `${index_1.IMAGE_CDN_BASE}/storage/v1/object/public/product-images/a.webp`;
        strict_1.default.equal((0, index_1.canonicalizeImageUrl)('https://supabase.amoeba.works/storage/v1/object/public/product-images/a.webp'), expected);
        strict_1.default.equal((0, index_1.canonicalizeImageUrl)('https://droplet.amoeba.works/supabase/storage/v1/render/image/public/product-images/a.webp?width=640'), expected);
        strict_1.default.equal((0, index_1.canonicalizeImageUrl)(expected), expected);
    });
    (0, node_test_1.it)('returns null for unrecognised URLs', () => {
        strict_1.default.equal((0, index_1.canonicalizeImageUrl)('https://example.com/image.jpg'), null);
    });
});
