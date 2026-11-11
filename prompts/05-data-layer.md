# 05 · Sanity data layer, images, prose, interface wording

Read docs/CONTENT-MODEL.md and docs/PAGES.md.

1. `src/lib/sanity/client.ts` (private dataset, Viewer token, `useCdn: false` on the server, API version 2026-10-01), `queries.ts` — one typed query per page/route returning exactly what its blocks need (defaults resolved with coalesce from siteSettings), `image.ts` (@sanity/image-url: width/height/srcset/sizes per slot, hotspot → object-position unless `position` is set).
2. `src/components/ui/Photo.astro`: renders a `photo` either as the design's `<img>` (same attributes as the snippet: class, style, loading, alt, decoding) or as the design's placeholder slot markup ("[Photo · …]" with the tone colours) — compare with snippets in design/build/blocks.
3. `src/components/ui/Prose.astro`: Portable Text → the exact `.s-prose` markup (see design/build/blocks/care-*/03-care.html): `<p>`, `<h3>`, `<ul><li>`, notice paragraph with its inline style, `<div style="overflow-x: auto; margin: 24px 0"><table class="s-tbl">…` with `th scope="col"`, optional button.
4. `src/content/ui.ts`: every fixed interface string from design/build/text.json that is not editorial (buttons, labels, aria labels, stock words, form labels and errors). Group by page. No string literals in components after this prompt.

**Checks:** typecheck · unit tests for the prose renderer (compare HTML to the snippet structure) and image helper.
