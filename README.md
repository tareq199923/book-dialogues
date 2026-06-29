# Book Dialogues

Two books enter. One idea wins.

**Book Dialogues** is a Next.js app that generates live, persona-driven debates between any two books using Google Gemini.

![Book Dialogues screenshot](./public/screenshot.png)

## Features

- **Persona derivation** — extracts a structured "mind" from each book (temperament, obsessions, argument style, voice)
- **Live streaming debates** — SSE-powered real-time back-and-forth with intro, debate, and reflection turns
- **Topic control** — auto-generated or manually edited debate topics
- **Persona cache** — derived personas are cached so revisiting a book is instant
- **Export & sharing** — download completed debates as Markdown or JSON, copy share links
- **History viewer** — revisit past debates
- **Persona gallery** — browse all cached personas with quick-start buttons

## Getting Started

### Prerequisites

- Node.js 20+
- A Google Gemini API key (get one at https://aistudio.google.com/app/apikey)

### Setup

```bash
git clone <repo-url>
cd book-dialogues
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Cold start:** The first debate after starting the app (or after a period of inactivity) can take 10–30s while the Gemini API spins up. Subsequent turns and cached personas are faster.

> **API costs:** Gemini 2.5 Flash's free tier supports roughly 600 persona derivations per month. See [Google AI pricing](https://ai.google.dev/pricing) for current limits.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
GEMINI_API_KEY=your_api_key_here
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for persona derivation and debate generation |

See [`.env.example`](./.env.example) for all available options and descriptions.

## Usage

1. Enter two book titles on the home page (e.g., "The Brothers Karamazov" vs "Beyond Good and Evil").
2. Preview the derived personas and generated topic — edit the topic or regenerate if desired.
3. Click confirm to start the live debate.
4. Watch the debate unfold turn by turn.
5. Download, copy the share link, or revisit in the history viewer.

## Deployment

### Vercel

Deploy with the Vercel CLI or Git integration:

```bash
npx vercel
```

Set the `GEMINI_API_KEY` environment variable in the Vercel dashboard. API routes have a 60-second maximum duration configured in `vercel.json`.

### Docker

```bash
docker build -t book-dialogues .
docker run -e GEMINI_API_KEY=your_key -p 3000:3000 book-dialogues
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS 4
- **AI:** Google Gemini 2.5 Flash via `@google/genai`
- **Storage:** File-based JSON (local) or `/tmp` (Vercel)
- **Deployment:** Vercel or Docker
