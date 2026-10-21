# MCTiers-Style Competitive Tier Testing System

A complete tier testing system for Minecraft competitive PvP, featuring an interactive Discord bot, REST backend API with Prisma ORM, and a Paper 1.21.x Java plugin.

```
Paper Plugin  <--REST/HTTP-->  Backend API  <-->  Postgres / SQLite
                                     ^
                                     |
                                Discord Bot
```

---

## 📁 Repository Structure

```
tiertesting/
├── shared/                 # Shared TypeScript types, tier calculations & constants
├── backend/                # Fastify REST API, Prisma schema, tier engine & tests
│   ├── prisma/             # Database schema (Players, Queues, Tests, Tiers, Audits)
│   └── src/                # Auth, routes, and services
├── bot/                    # discord.js v14 bot for queues, tickets, and roles
│   └── src/                # Interactive queue panel, ticket manager, commands
└── plugin/                 # Paper 1.21.x Minecraft Java plugin (Gradle)
    └── src/                # In-game linking (/link), arenas, kits, and matches
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **Java**: 21+ (for Paper plugin)
- A Discord Bot Token & Application Client ID from the [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Install & Build Monorepo
```bash
# In the root repository
npm install
npm run build
```

### 3. Setup Backend API
```bash
cd backend
# Database is already initialized as SQLite dev.db (or configure Postgres in .env)
npm run prisma:push
npm run test           # Runs tier calculation & full flow integration tests
npm run dev            # Starts backend on http://localhost:3001
```

### 4. Setup Discord Bot
1. In `bot/.env`, set your Discord credentials:
   ```env
   DISCORD_TOKEN="your_bot_token"
   DISCORD_CLIENT_ID="your_client_id"
   DISCORD_GUILD_ID="your_guild_id"

   BACKEND_URL="http://localhost:3001/api"
   BOT_API_KEY="test_bot_secret_key"

   # Target Channels & Categories
   QUEUE_CHANNEL_ID="channel_id_where_embed_lives"
   RESULTS_CHANNEL_ID="channel_id_where_results_are_posted"
   TICKETS_CATEGORY_ID="category_id_where_tickets_are_created"
   ```
2. Deploy slash commands to Discord:
   ```bash
   cd bot
   npm run deploy-commands
   ```
3. Start the bot:
   ```bash
   npm run dev
   ```

---

## 🎮 Gamemodes & Tier System

### Gamemodes Supported
- ⚔️ **Sword**: 1.21 Sword PvP, Shields & Regeneration
- 🔮 **Crystal**: End Crystal & Respawn Anchor PvP
- 🧪 **Pot (Nodebuff)**: Speed II, Strength, Splash Potions
- 🪓 **Axe**: Shield disable & critical hit trading
- 🛡️ **SMP**: Survival Multiplayer gear
- 🍎 **UHC**: Golden heads, bows, rods & gapples
- 🔨 **Mace**: 1.21 Mace & Wind Charge aerial mechanics

### Tier Scale
- Tiers: `LT5`, `HT5`, `LT4`, `HT4`, `LT3`, `HT3`, `LT2`, `HT2`, `LT1`, `HT1`
- **Max Jump Rule**: Retests cap promotions / demotions to `±2` tiers per test.
- **Retest Cooldown**: 14-day default cooldown per gamemode (customizable in `.env`).
- **Initial Placement**: Capped safely at `HT3` max for first-time unranked tests.

---

## 🤖 Discord Commands & Automation

| Command | Permission | Description |
|---|---|---|
| `/link <code>` | Everyone | Links Minecraft account using the code generated in-game |
| `/queue join [mode]` | Everyone | Joins the queue for a gamemode (or use button panel) |
| `/queue leave` | Everyone | Leaves active waiting queue |
| `/queue panel` | Admin | Posts/refreshes the persistent live button queue embed |
| `/profile [user/ign]` | Everyone | Shows linked IGN, UUID, avatar and tier summary |
| `/tiers [user/ign]` | Everyone | Full breakdown of all 7 gamemodes with points & cooldowns |
| `/next [gamemode]` | Tester | Claims next queued player & spawns a private ticket channel |
| `/submit` | Tester | Opens interactive modal to enter match score |
| `/close [delay]` | Tester | Closes and cleans up the ticket channel |
| `/admin tester add/remove` | Admin | Promotes or demotes testers with permission sync |
| `/admin blacklist add/remove` | Admin | Blacklists players from testing queues |
| `/admin gamemode toggle` | Admin | Enables or disables a gamemode |

---

## 🛡️ Security & Integrity
- **Stateless Bot**: The Discord bot maintains zero local state and treats the Backend API as the single source of truth.
- **Role Verification**: Backend verifies tester status independently of Discord roles.
- **Idempotency**: Match results can only be submitted once per test ID.
- **Audit Logging**: Every tier change, blacklist, and match score is permanently audit logged.
