"use strict";
/**
 * @amoeba/image-url — canonical image-URL builder for the amoeba.works constellation.
 *
 * Single source of truth for converting Supabase storage `(bucket, path)` tuples
 * into public URLs. Mirrors the SQL function `core.public_image_url(bucket, path)`
 * byte-for-byte so DB triggers, views, and application code never disagree.
 *
 * Consumers: droplet, offers3, modern-office-v2, amoeba-works, mitta-collective,
 * dosafa-webshop. All wired via `file:../image-url` in their package.json.
 *
 * Does NOT handle:
 *   - signed URLs (private buckets) — consumer responsibility
 *   - imgproxy URL signing — future security upgrade, separate concern
 *   - DB reads / variant selection — droplet's ImageService keeps that logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_BUCKET = exports.PLACEHOLDER_IMAGE_URL = exports.STORAGE_RENDER_PATH = exports.STORAGE_PUBLIC_PATH = exports.IMAGE_CDN_BASE = void 0;
exports.publicImageUrl = publicImageUrl;
exports.renderImageUrl = renderImageUrl;
exports.withRenderParams = withRenderParams;
exports.isCanonicalImageUrl = isCanonicalImageUrl;
exports.parseImageUrl = parseImageUrl;
exports.canonicalizeImageUrl = canonicalizeImageUrl;
/** The constellation's canonical CDN host. Hardcoded — drift starts when this becomes env-dependent. */
exports.IMAGE_CDN_BASE = 'https://images.amoeba.works';
/** Supabase storage path for the original object (no transform). */
exports.STORAGE_PUBLIC_PATH = '/storage/v1/object/public';
/** Supabase storage path for the imgproxy-backed render endpoint (resize / quality / format). */
exports.STORAGE_RENDER_PATH = '/storage/v1/render/image/public';
/** Placeholder used when neither bucket nor path is set. Matches droplet's historic value. */
exports.PLACEHOLDER_IMAGE_URL = '/images/placeholder-product.png';
/** Default bucket when caller omits one. Most catalog images live here. */
exports.DEFAULT_BUCKET = 'product-images';
/** Hostnames recognised as "this is a Supabase storage URL we can canonicalize". */
const KNOWN_STORAGE_HOSTS = new Set([
    'images.amoeba.works',
    'supabase.amoeba.works',
    'droplet.amoeba.works',
]);
/**
 * Build the canonical public URL for a storage object (no transform).
 *
 * Returns the placeholder when `path` is missing — callers don't have to null-check.
 * When `bucket` is null/empty, falls back to `DEFAULT_BUCKET` (current droplet convention).
 */
function publicImageUrl(bucket, path) {
    if (!path || !path.trim())
        return exports.PLACEHOLDER_IMAGE_URL;
    const b = bucket && bucket.trim() ? bucket.trim() : exports.DEFAULT_BUCKET;
    const p = stripLeadingSlash(path.trim());
    return `${exports.IMAGE_CDN_BASE}${exports.STORAGE_PUBLIC_PATH}/${b}/${p}`;
}
/**
 * Build the canonical imgproxy-render URL with the requested width/quality/format.
 *
 * Returns the placeholder when `path` is missing. When called with no options,
 * returns a render URL with no query params — Supabase's imgproxy uses its defaults.
 */
function renderImageUrl(bucket, path, opts = {}) {
    if (!path || !path.trim())
        return exports.PLACEHOLDER_IMAGE_URL;
    const b = bucket && bucket.trim() ? bucket.trim() : exports.DEFAULT_BUCKET;
    const p = stripLeadingSlash(path.trim());
    const base = `${exports.IMAGE_CDN_BASE}${exports.STORAGE_RENDER_PATH}/${b}/${p}`;
    const query = buildQuery(opts);
    return query ? `${base}?${query}` : base;
}
/**
 * Append render-transform query params to a URL that's already canonical (or close to).
 * Used by Next.js Image loaders that receive the canonical URL upstream and only need
 * to add width/quality at render time. Idempotent: existing params win over new ones.
 */
function withRenderParams(canonicalUrl, opts) {
    if (!canonicalUrl)
        return canonicalUrl;
    let u;
    try {
        u = new URL(canonicalUrl);
    }
    catch {
        return canonicalUrl;
    }
    // Upgrade /object/public/ → /render/image/public/ when sizing params are present.
    if ((opts.width || opts.height || opts.quality || opts.format) &&
        u.pathname.includes(exports.STORAGE_PUBLIC_PATH)) {
        u.pathname = u.pathname.replace(exports.STORAGE_PUBLIC_PATH, exports.STORAGE_RENDER_PATH);
    }
    setIfAbsent(u, 'width', opts.width);
    setIfAbsent(u, 'height', opts.height);
    setIfAbsent(u, 'quality', opts.quality);
    setIfAbsent(u, 'format', opts.format);
    return u.toString();
}
/**
 * Return true iff `url` matches the canonical shape exactly:
 *   https://images.amoeba.works/storage/v1/(object|render/image)/public/{bucket}/{path}
 *
 * Used by audits / lint rules / verification scripts. Does NOT accept the legacy
 * `droplet.amoeba.works/supabase/...` or `supabase.amoeba.works/...` shapes.
 */
function isCanonicalImageUrl(url) {
    if (!url)
        return false;
    return CANONICAL_RE.test(url);
}
/**
 * Parse any of the recognised storage URL shapes back into `(bucket, path)`.
 *
 * Recognised shapes:
 *   - canonical:     https://images.amoeba.works/storage/v1/object/public/{bucket}/{path}
 *   - canonical-rd:  https://images.amoeba.works/storage/v1/render/image/public/{bucket}/{path}
 *   - supabase:      https://supabase.amoeba.works/storage/v1/(object|render/image)/public/{bucket}/{path}
 *   - legacy-proxy:  https://droplet.amoeba.works/supabase/storage/v1/(object|render/image)/public/{bucket}/{path}
 *   - broken-cdn:    https://images.amoeba.works/supabase/storage/v1/(object|render/image)/public/{bucket}/{path}
 *
 * Returns null if the URL doesn't match any known shape (e.g. external third-party URL).
 */
function parseImageUrl(url) {
    if (!url || !url.trim())
        return null;
    let u;
    try {
        u = new URL(url.trim());
    }
    catch {
        return null;
    }
    if (!KNOWN_STORAGE_HOSTS.has(u.hostname.toLowerCase()))
        return null;
    // Normalize legacy/broken `/supabase/` prefix.
    let path = u.pathname;
    if (path.startsWith('/supabase/'))
        path = path.slice('/supabase'.length);
    // Match `/storage/v1/(object|render/image)/public/{bucket}/{rest}`.
    const match = path.match(/^\/storage\/v1\/(?:object|render\/image)\/public\/([^/]+)\/(.+)$/);
    if (!match || !match[1] || !match[2])
        return null;
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
}
/**
 * Convenience: if the input is a recognised URL, re-emit it canonically; otherwise
 * return null. Useful for one-shot migration scripts and lint autofixers.
 */
function canonicalizeImageUrl(url) {
    const parsed = parseImageUrl(url);
    if (!parsed)
        return null;
    return publicImageUrl(parsed.bucket, parsed.path);
}
// ── internals ───────────────────────────────────────────────────────────────
const CANONICAL_RE = /^https:\/\/images\.amoeba\.works\/storage\/v1\/(?:object|render\/image)\/public\/[^/]+\/.+$/;
function stripLeadingSlash(s) {
    return s.startsWith('/') ? s.slice(1) : s;
}
function buildQuery(opts) {
    const params = [];
    if (opts.width != null)
        params.push(`width=${encodeURIComponent(String(Math.round(opts.width)))}`);
    if (opts.height != null)
        params.push(`height=${encodeURIComponent(String(Math.round(opts.height)))}`);
    if (opts.quality != null)
        params.push(`quality=${encodeURIComponent(String(Math.round(opts.quality)))}`);
    if (opts.format)
        params.push(`format=${encodeURIComponent(opts.format)}`);
    return params.join('&');
}
function setIfAbsent(u, key, value) {
    if (value == null || value === '')
        return;
    if (u.searchParams.has(key))
        return;
    const v = typeof value === 'number' ? String(Math.round(value)) : value;
    u.searchParams.set(key, v);
}
