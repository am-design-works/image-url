# @amoeba/image-url

Canonical image-URL builder for the amoeba.works constellation. The **single source
of truth** for converting Supabase storage `(bucket, path)` tuples into public URLs.

## Why this exists

Before this package, six repos each rolled their own image-URL helpers. Drift
accumulated — four different URL shapes ended up in production, and every consumer
shipped a normalizer to patch them at render time. This package collapses that
to one builder, mirrored byte-for-byte by the SQL function
`core.public_image_url(bucket, path)` so DB triggers, views, and TypeScript code
can never disagree.

See `~/.claude/plans/this-is-the-right-velvety-dijkstra.md` for the constellation-wide
rollout plan.

## Consumers

Wired via `"file:../image-url"` in each repo's `package.json`:

- `droplet` (canonical emitter; `ImageService.buildImageUrl` delegates to this)
- `offers3`
- `modern-office-v2`
- `amoeba-works`
- `mitta-collective`
- `dosafa-webshop`

## API

```ts
import { publicImageUrl, renderImageUrl, withRenderParams, parseImageUrl, isCanonicalImageUrl } from '@amoeba/image-url';

publicImageUrl(bucket, path);
// → "https://images.amoeba.works/storage/v1/object/public/{bucket}/{path}"

renderImageUrl(bucket, path, { width: 640, quality: 82, format: 'origin' });
// → "https://images.amoeba.works/storage/v1/render/image/public/{bucket}/{path}?width=640&quality=82&format=origin"

withRenderParams(canonicalUrl, { width: 640 });
// Used by Next.js Image loaders — adds query params to an already-canonical URL,
// upgrading /object/public/ → /render/image/public/ when sizing is requested.

parseImageUrl(anyKnownUrlShape);
// → { bucket, path } | null  — accepts all 4 historic drifted shapes for migration use.

isCanonicalImageUrl(url);
// → boolean — strict canonical check, used in verification scripts.
```

## What this does NOT do

- **Signed URLs / private buckets** — consumer responsibility (see
  `offers3/lib/server/imageUrl.ts` for the pattern).
- **imgproxy URL signing** — future security upgrade tracked separately.
- **Variant selection (size_variants pre-rendered paths)** — droplet's
  `ImageService.selectVariantSize()` keeps that logic local. This module only
  handles the URL string assembly.
- **Read env vars** — `IMAGE_CDN_BASE` is hardcoded. Drift starts the moment a URL
  prefix becomes environment-dependent.

## Editing this package

1. Edit `src/index.ts`.
2. Update `src/test.ts` if behaviour changes.
3. Run `npm run build` — this regenerates `dist/`.
4. Run `npm test` — node's built-in test runner; sanity checks for URL shape.
5. Commit both `src/` and `dist/` together.

`dist/` is checked in because `file:../` deps don't trigger a build step in the
consumer's install. Forgetting to rebuild means consumers see stale code.

Mirror any behavioural change in the SQL function `core.public_image_url(bucket, path)`
in droplet's migrations. The two are intentionally kept identical.
