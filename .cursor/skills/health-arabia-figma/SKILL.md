---
name: health-arabia-figma
description: Inspect the Health Arabia Figma file or turn its screens into code. Use when the user mentions Figma, a screen/frame name or node ID from this project, design audit, or design-to-code for Health Arabia.
---

# Health Arabia Figma workflow

File key: `T4lscZxor3C5196h5KzSEA`. Screens: page `Design` (351:570).

## Quota first

The Figma account is a View seat with a low MCP call limit. Every call counts.

1. One `get_metadata` on the page or frame to get node IDs. Never call it per child.
2. Batch structural reads (fonts, colors, links, text) into a single read-only `use_figma` script.
3. Call `get_design_context` (with screenshot) only on the frame being implemented.
4. Use `get_screenshot` only for frames that still need visual checks.
5. If the limit is hit, stop and ask the user to export PNGs instead of retrying.

## Read-only by default

Never create or edit Figma nodes unless the user explicitly asks. `use_figma` scripts for audits must only read and `return` data.

## Design to code

1. Load the plugin skill `figma-design-to-code` before `get_design_context`.
2. Translate the returned React/Tailwind into the project's actual stack and existing components.
3. Map colors to tokens: green-500 `#1B8A8A`, blue-500 `#0A2647`, blue-400 `#3B516C`, blue-300 `#5B6E84`, blue-200 `#8E9BAA`, blue-50 `#E7E9ED`, green-50 `#E8F3F3`, red `#FF3B30`, page bg `#F8FAFC`.
4. Body font is Carlito; confirm heading font with the user (file also uses Cairo and Alexandria).
5. Download assets into the project; never ship temporary Figma asset URLs.

## Known design gaps

Layer names do not always match rendered text: verify against a screenshot. Admin screens, job submission/approval, per-job anonymous applicants with multi-select hire requests, identity reveal, group chat, mobile/tablet, and RTL are not designed. Report gaps instead of inventing UI.
