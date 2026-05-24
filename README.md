# IPL Auction Game

Real-time multiplayer IPL Auction web app. Play with up to 10 friends.

## Features

- **3 Auction Modes**: Mega Auction (120Cr), IPL 2026 Mini Auction, Custom Retention
- **Real-time bidding** with Socket.IO (handles 10 simultaneous bids)
- **Server-authoritative** - no cheating, no race conditions
- **RTM (Right to Match)** support in retention modes
- **539 IPL 2026 players** — official auction list plus retained squads (162 overseas)
- **Host controls** — room creator can start early, add bots, pause, extend timer, skip, rematch
- **Real-time chat & live activity feed**
- **Spectator mode** — watch without bidding
- **Session tokens** — secure rejoin after disconnect (no name hijacking)
- **JSON room snapshots** — survives server restarts (no database)
- **Official team logos** in `/public/logos`
- **Sound effects** for bids, sold, unsold, RTM
- **Bot teams** — fill empty franchises for solo testing
- **Export auction results** as JSON
- **Auto-progressing auction** - no admin needed
- **Rejoin anytime** - close the tab, come back later, pick up where you left off
- **Recent Rooms** - landing page shows your last 5 rooms for quick rejoin

## Player Data

Player list is sourced from the official BCCI [IPL 2026 auction PDF](https://documents.iplt20.com/bcci/documents/1765197869375_TATA-IPL-2026-Auction-List-8.12.25.pdf), merged with 2026 retention data.

Regenerate `src/data/players.json`:

```bash
npm run generate-players
```

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000, create a room, share the code with friends.

## Deploy for Free (Render — recommended)

No Pro plan. Sign up with GitHub only.

1. Push this project to a **GitHub** repository
2. Go to [dashboard.render.com](https://dashboard.render.com) → sign up with GitHub
3. **New +** → **Blueprint** → connect your repo (Render reads `render.yaml` automatically)

   **Or manual Web Service:**
   - **New +** → **Web Service** → connect repo
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Plan:** Free

4. Wait for deploy (~3–5 min). You get a URL like `https://ipl-auction.onrender.com`
5. Share that URL with friends

**Note:** Free tier sleeps after ~15 min with no traffic. First visit after sleep takes ~30–60 seconds to wake up.

## Alternative: Railway

Railway gives ~$5 trial credit (about a month of light use).

1. Push to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Railway uses `railway.json` automatically
4. Settings → Networking → Generate Domain → share URL

## Tech Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Socket.IO for real-time communication
- Framer Motion for animations
- Express custom server
