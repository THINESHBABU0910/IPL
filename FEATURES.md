# IPL Auction — Features & Upgrades

## Implemented

### Live auction chat (inline)
- Chat is **embedded in the auction stage** — not a separate tab
- Sits between bid info and the **RAISE TO** button
- **Text box only** — type and press Enter to send
- Merges **live commentary** (sold, unsold, bids, system) with player messages
- Shows current player on block in header

### Real-time multiplayer
- WebSocket-only Socket.IO
- Instant `bid-update` events
- Session tokens + reconnect
- Room snapshots

### IPL-style auction
- TV auction stage, franchise bar, hammer callouts
- Official bid increment ladder, timer reset on bid
- SOLD / UNSOLD / RTM overlays + sounds

### No AI bots · Host admin · Name gate · Team tabs · Feed tab

### Logos (9/10 official)
| Team | Source |
|------|--------|
| CSK, MI, RCB, DC, KKR, SRH, RR | PNG from CCBP CDN |
| PBKS, GT | Wikimedia SVG |
| LSG | Branded SVG (no public CDN found) |

Run `npm run download-logos` to re-fetch.

### Auction modes
| Mode | Description |
|------|-------------|
| **Mega Auction** | Full player pool, ₹120 Cr purse, 6 RTM cards |
| **IPL Retention** | Official retention slabs (₹18/14/11/18/14 Cr + ₹4 Cr uncapped), then auction with remaining purse |
| **Flex Retention** | Pick your squad players with **custom prices** — total deducted from ₹120 Cr, remainder for auction |

Mini auction mode removed.

---

## New features for a more realistic & fun experience

### Auction realism
| Feature | Why it matters |
|---------|----------------|
| **Auctioneer voice** | "Sold to Mumbai Indians!" audio on hammer — like TV |
| **Set-wise hammer** | Host announces set changes (Marquee, All-rounders, etc.) |
| **Accelerated round** | Round 2 unsold at 90% base with different timer |
| **Joker / wildcard pick** | Host can insert a surprise player mid-set |
| **Pre-auction strategy board** | Each team marks target players before start |
| **Max bid warning** | Alert when bid would leave insufficient purse for min squad |
| **Overseas cap lock** | Block bid if team already at 8 overseas |
| **RTM countdown on screen** | Big visible timer for entire room during RTM |

### Social & drama
| Feature | Why it matters |
|---------|----------------|
| **Inline chat reactions** | Quick emoji reactions (🔥 😱 💀) on current lot |
| **Trash talk stickers** | Team-branded reaction badges |
| **MVP vote after auction** | Friends vote best pick / worst overpay |
| **Meme of the auction** | Auto-highlight biggest overpay / steal |
| **Team group voice** | Optional Discord/Meet link per room |

### Strategy depth
| Feature | Why it matters |
|---------|----------------|
| **Role balance meter** | BAT/BOWL/AR/WK bars per team — like real squads |
| **Purse planner** | "If you buy this player, max you can spend on remaining slots" |
| **Player comparison** | Side-by-side stats for two shortlisted players |
| **Set preview queue** | Next 5 players in current set visible to all |
| **Wishlist / shortlist** | Star players privately; host sees aggregate demand |
| **Trade window** | Post-auction 1-for-1 player swap between teams (fun mode) |

### Host & league tools
| Feature | Why it matters |
|---------|----------------|
| **Co-host / auctioneer role** | Separate person runs hammer vs plays |
| **Undo last sale** | Fix accidental hammer |
| **Room password** | Private friends-only rooms |
| **Draft order for sets** | Custom set order like BCCI auction |
| **Tournament mode** | 4 rooms → playoffs → super auction final |
| **Export squads PDF** | Shareable final team sheets with logos |

### Immersion
| Feature | Why it matters |
|---------|----------------|
| **Stadium crowd ambience** | Background crowd noise, louder on bids |
| **Team theme on bid** | Brief team anthem sting when franchise bids |
| **Player walk-in animation** | Spotlight + name reveal like broadcast |
| **Big screen mode** | `/display/:roomId` for casting to TV |
| **Photo / face cards** | Player images on auction card |
| **IPL stats overlay** | Runs, wickets, strike rate on player card |

### Mobile & UX
| Feature | Why it matters |
|---------|----------------|
| **Bid paddle button** | Large thumb-friendly paddle on mobile |
| **Haptic feedback** | Vibrate on timer warning / outbid |
| **Push notifications** | "Your turn — RTM available!" |
| **Dark/light broadcast themes** | Match IPL TV look |

---

## Run locally

```bash
cd ipl-auction
npm install
npm run download-logos   # optional — refresh team logos
npm run dev
```

Open http://localhost:3000
