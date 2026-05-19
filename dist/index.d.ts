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
/** The constellation's canonical CDN host. Hardcoded — drift starts when this becomes env-dependent. */
export declare const IMAGE_CDN_BASE = "https://images.amoeba.works";
/** Supabase storage path for the original object (no transform). */
export declare const STORAGE_PUBLIC_PATH = "/storage/v1/object/public";
/** Supabase storage path for the imgproxy-backed render endpoint (resize / quality / format). */
export declare const STORAGE_RENDER_PATH = "/storage/v1/render/image/public";
/** Placeholder used when neither bucket nor path is set. Matches droplet's historic value. */
export declare const PLACEHOLDER_IMAGE_URL = "/images/placeholder-product.png";
/** Default bucket when caller omits one. Most catalog images live here. */
export declare const DEFAULT_BUCKET = "product-images";
export interface RenderOptions {
    /** Pixel width to request from imgproxy. Round to nearest integer; clamp upstream. */
    width?: number;
    /** Pixel height to request from imgproxy. Usually omitted; width + aspect is enough. */
    height?: number;
    /** Lossy encoder quality, 1–100. Defaults to no quality param (imgproxy default). */
    quality?: number;
    /**
     * Output format. `'origin'` keeps the source format (with WebP auto-promotion via
     * imgproxy's Accept-header detection). `'auto'` lets imgproxy fully pick. Omit to
     * inherit Supabase's render-endpoint default.
     */
    format?: 'origin' | 'auto' | 'webp' | 'avif' | 'png' | 'jpeg';
}
/**
 * Build the canonical public URL for a storage object (no transform).
 *
 * Returns the placeholder when `path` is missing — callers don't have to null-check.
 * When `bucket` is null/empty, falls back to `DEFAULT_BUCKET` (current droplet convention).
 */
export declare function publicImageUrl(bucket: string | null | undefined, path: string | null | undefined): string;
/**
 * Build the canonical imgproxy-render URL with the requested width/quality/format.
 *
 * Returns the placeholder when `path` is missing. When called with no options,
 * returns a render URL with no query params — Supabase's imgproxy uses its defaults.
 */
export declare function renderImageUrl(bucket: string | null | undefined, path: string | null | undefined, opts?: RenderOptions): string;
/**
 * Append render-transform query params to a URL that's already canonical (or close to).
 * Used by Next.js Image loaders that receive the canonical URL upstream and only need
 * to add width/quality at render time. Idempotent: existing params win over new ones.
 */
export declare function withRenderParams(canonicalUrl: string, opts: RenderOptions): string;
/**
 * Return true iff `url` matches the canonical shape exactly:
 *   https://images.amoeba.works/storage/v1/(object|render/image)/public/{bucket}/{path}
 *
 * Used by audits / lint rules / verification scripts. Does NOT accept the legacy
 * `droplet.amoeba.works/supabase/...` or `supabase.amoeba.works/...` shapes.
 */
export declare function isCanonicalImageUrl(url: string | null | undefined): boolean;
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
export declare function parseImageUrl(url: string | null | undefined): {
    bucket: string;
    path: string;
} | null;
/**
 * Convenience: if the input is a recognised URL, re-emit it canonically; otherwise
 * return null. Useful for one-shot migration scripts and lint autofixers.
 */
export declare function canonicalizeImageUrl(url: string | null | undefined): string | null;
