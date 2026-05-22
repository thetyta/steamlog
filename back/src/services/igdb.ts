import { request } from 'undici'
import { requireEnv } from '../lib/env.js'

type IgdbToken = { access_token: string; expires_at: number }
let cachedToken: IgdbToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now()) return cachedToken.access_token

  const url =
    `https://id.twitch.tv/oauth2/token` +
    `?client_id=${requireEnv('IGDB_CLIENT_ID')}` +
    `&client_secret=${requireEnv('IGDB_CLIENT_SECRET')}` +
    `&grant_type=client_credentials`

  const res = await request(url, { method: 'POST' })
  const body = (await res.body.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    access_token: body.access_token,
    expires_at: Date.now() + (body.expires_in - 60) * 1000,
  }
  return cachedToken.access_token
}

export type IgdbGame = {
  id: number
  name: string
  summary?: string
  first_release_date?: number
  cover?: { url: string }
  genres?: { id: number; name: string }[]
}

export async function fetchGamesBySteamAppIds(steamAppIds: number[]): Promise<Map<number, IgdbGame>> {
  if (steamAppIds.length === 0) return new Map()

  const token = await getAccessToken()
  const headers = {
    'Client-ID': requireEnv('IGDB_CLIENT_ID'),
    Authorization: `Bearer ${token}`,
  }

  const externals = await request('https://api.igdb.com/v4/external_games', {
    method: 'POST',
    headers,
    body:
      `fields game,uid; where external_game_source = 1 & uid = (${steamAppIds.map((id) => `"${id}"`).join(',')}); limit 500;`,
  })
  if (externals.statusCode >= 400) {
    throw new Error(
      `IGDB external_games ${externals.statusCode}: ${await externals.body.text()}`,
    )
  }
  const externalsBody = (await externals.body.json()) as { game: number; uid: string }[]

  const gameIds = externalsBody.map((e) => e.game)
  if (gameIds.length === 0) return new Map()

  const games = await request('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers,
    body:
      `fields id,name,summary,first_release_date,cover.url,genres.id,genres.name; ` +
      `where id = (${gameIds.join(',')}); limit 500;`,
  })
  if (games.statusCode >= 400) {
    throw new Error(`IGDB games ${games.statusCode}: ${await games.body.text()}`)
  }
  const gamesBody = (await games.body.json()) as IgdbGame[]

  const igdbBySteamId = new Map<number, IgdbGame>()
  for (const ext of externalsBody) {
    const game = gamesBody.find((g) => g.id === ext.game)
    if (game) igdbBySteamId.set(Number(ext.uid), game)
  }
  return igdbBySteamId
}
