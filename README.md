# skystats discord bot

Discord bot for skystats.cc. Talks to the skystats server through its public `/v1` API, the same API anyone else would use.

## Commands

| Command | What it does |
|---|---|
| `/ping` | Bot latency + whether the SkyStats API is reachable |
| `/bazaar item:<name>` | Live instabuy/instasell, margin, weekly volume, 7-day change. Item names autocomplete. |
| `/status` | status.hypixel.net summary: SkyBlock status, components with issues, incidents |

## Setup

1. Create an application at https://discord.com/developers/applications
   - **Bot** tab → Reset Token → copy it into `DISCORD_TOKEN`
   - **General Information** → copy Application ID into `DISCORD_CLIENT_ID`
   - **Installation** → enable Guild Install with scopes `bot` + `applications.commands`, then use the install link to add it to your test server
2. In Discord, turn on Developer Mode (Settings → Advanced), right-click your test server → Copy Server ID → `DISCORD_GUILD_ID`
3. Run it:

```bash
npm install
cp .env.example .env        # fill in the values above
npm run deploy-commands     # register slash commands (re-run when commands change)
npm run dev
```

The skystats server must be running (`SKYSTATS_API_URL`, default `http://localhost:3000`).

## Production

CI builds `ghcr.io/skystats-cc/discord-bot` on every merge to `main`. The `infra` repo runs it; register commands there with
`docker compose run --rm bot node dist/deploy-commands.js` after deploying a change to commands.

## Adding a command

1. Create `src/commands/<name>.ts` exporting a `Command` (see `ping.ts` for the smallest example, `bazaar.ts` for autocomplete).
2. Add it to the list in `src/commands/index.ts`.
3. `npm run deploy-commands`.

Commands get data from `src/api.ts` only (the typed `@skystats/api-client` from the `api-spec` repo). Never call Hypixel directly from the bot.

## TODO

- Account linking via Discord auth, tier-aware responses.
- Anomaly notifications (bazaar price spikes) pushed to channels.
