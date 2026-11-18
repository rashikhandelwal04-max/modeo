# MY GALA — personal fashion universe

> YOUR STYLE. YOUR STAGE.

A Next.js app that styles the clothes you **own**: personal photo onboarding, a Style Studio that
returns four explained directions for any garment, an interactive "Style your …" panel with
designer annotations, a digital wardrobe, saved-look collections, a style profile that learns,
and a pluggable virtual try-on layer.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
# or, production:
npm run build && npm start
```

Requires Node 20+. No keys are needed to run — see "What needs credentials" below.

### Optional keys (`.env.local`, server-side only)

```bash
cp .env.example .env.local
```

| Variable | Enables |
|---|---|
| `ANTHROPIC_API_KEY` | Garment recognition from photos (vision) + AI styling by Claude (`claude-opus-5-5` by default, override with `MY GALA_CLAUDE_MODEL`) |
| `FASHN_API_KEY` | Real virtual try-on from a garment photo (FASHN) |
| `REPLICATE_API_TOKEN` | Real, text-guided outfit try-on on your photo (Replicate, default `black-forest-labs/flux-kontext-pro`) |

Keys are read only in API routes (`app/api/*`). `/api/status` reports which integrations are on, never the keys.

## What is genuinely functional (no keys)

- **Photo onboarding**: upload, preview, replace, drag/zoom crop to a 3:4 full-length frame, explicit consent
  (permission + processing, with a separate opt-in for training that is off by default), and deletion. Skip is supported.
- **Private storage**: photo, wardrobe images and try-on results live in the browser's IndexedDB; metadata lives in
  localStorage. Nothing is stored on the server.
- **Style Studio**: describe a garment (free text is parsed into category, colour, fit, fabric, length, pattern, detail), paste a
  product URL (the server reads the page's public title and image), upload a photo (dominant colour is detected on-device), or
  pick from your wardrobe, an aesthetic or an occasion.
- **Styling engine** (`lib/styling/engine.ts`): a deterministic, offline rule-based stylist, clearly labelled "Rule-based
  stylist" in the UI. It produces four distinct looks (minimal, casual, bold, contemporary), covering Western, Indian and accessory
  categories. It reasons about colour theory (complements, analogous, partner neutrals, metals), proportion, texture, formality,
  occasion, season, budget, preferred fits, favourite and avoided colours, learned affinity and recent repetition. Every look explains *why*.
  You can nudge it (more minimal, experimental, formal, casual, colourful, elegant or affordable) and swap individual pieces.
- **Interactive panel**: click any garment and "Style your black blazer." opens. Tops, bottoms, layers, shoes, jewellery, bags,
  accessories and colour pairings update the outfit instantly. Sarees and lehengas get blouse, jewellery, draping and hair options.
- **Wardrobe**: multi-photo upload, manual attribute correction, filters (category, colour, occasion, season, style), and "How else can
  I wear this?" in two modes. *My wardrobe* uses only owned pieces and names any gaps. *Explore* adds clearly marked suggestions.
- **Saved Looks**: gallery, collections (Work, College, Weekend, Travel, Party, Weddings, plus custom ones), notes, rename, delete,
  and download of try-on images.
- **Profile**: aesthetics, colours, fits, categories, budget, occasions and comfort, plus learned preferences from saves and 👍/👎,
  photo management, consent toggles and "delete all my data".

## What needs credentials

- **Garment recognition from photos** and **Claude styling** need `ANTHROPIC_API_KEY`. Without it you choose the category
  manually and the rule engine styles the outfit.
- **Virtual try-on** needs `FASHN_API_KEY` or `REPLICATE_API_TOKEN`. Without one, the Try-On page runs in a clearly labelled
  **demo mode**. It shows your original photo and the look board and **never** fakes a result by overlaying clothes.
  - FASHN needs a garment *photo* (a garment you photographed, a wardrobe item with a photo, or a product URL image).
  - Replicate works from the outfit's text description and can try on any look.
  - Results come with before/after comparison, regenerate, variations, save and download.
- **Authentication and permanent cloud storage** (Supabase) are Phase 3 and not yet implemented. Data is per-browser.

## Architecture

```
app/
  welcome/               onboarding (photo, crop, consent)
  (studio)/              app shell + Home, Wardrobe, Studio, Try-On, Looks, Profile
  api/status             which integrations are configured
  api/style              Claude stylist → falls back to rule engine
  api/analyze-garment    Claude vision garment recognition
  api/product-url        product page metadata (SSRF-guarded)
  api/try-on, [id]       try-on job start + poll (provider-agnostic)
components/              LookBoard (editorial collage + ink annotations), Flat (SVG fashion flats),
                         StylePanel, LookCard, PhotoCropper, PhotoSetup, GarmentEditor, ui
lib/
  styling/               catalog + engine (colour, proportion, texture, formality, learning)
  tryon/                 provider interface + FASHN + Replicate (add providers in lib/tryon/index.ts)
  ai/claude.ts           Anthropic SDK calls with structured (zod) outputs
  store/                 app state (localStorage) + private image store (IndexedDB)
```

Swapping to Supabase later means replacing persistence in `lib/store/state.tsx` and `lib/store/images.ts`;
UI components don't touch storage directly.

## Privacy & security

- Explicit consent before any processing. Training use is a separate opt-in, and MY GALA does not train on photos at all.
- Personal photos stay on the device. They are sent only to the try-on provider, only when you press Generate, and the server relays them without saving.
- API keys are server-only. API routes check the request origin, rate-limit per IP (in-memory, so replace it in production), validate image
  payloads (type and size), and the URL reader blocks private and loopback addresses.
