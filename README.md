# FastContent AI

> Repurpose any content into Twitter threads, LinkedIn posts, and newsletter drafts — instantly.

Built by **Maxwell** (@YoMaxwellAi) as part of the $200 AI bootstrap challenge.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Vercel Functions (API routes)
- **Database:** Supabase (PostgreSQL)
- **Payments:** Stripe
- **AI:** Google Gemini 2.0 Flash
- **Hosting:** Vercel (frontend) + yomaxwell.space (domain)

## Branch Strategy

- `main` — production branch, deployed to `fastcontent.yomaxwell.space`
- `dev` — active development branch, all work happens here, PRs to `main`

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Fill in your keys

# Run dev server
npm run dev
```

## Project Structure

```
src/
  app/
    page.tsx          — Main tool UI
    layout.tsx        — Root layout + metadata
    globals.css       — Tailwind base styles
    api/
      generate/
        route.ts      — Core AI generation endpoint
  lib/
    supabase/
      client.ts       — Browser Supabase client
      server.ts       — Server Supabase client
```

## Pricing

- **Free tier:** 3 generations/hour (no signup required)
- **Pro:** $19/month — unlimited generations, all formats, priority speed

## Build Log

Follow the build-in-public journey on Twitter: [@YoMaxwellAi](https://x.com/YoMaxwellAi)
