import { request } from 'undici'
import { requireEnv } from '../lib/env.js'

const STEAM_API = 'https://api.steampowered.com'

export type SteamProfile = {
  steamid: string
  personaname: string
  profileurl: string
  avatarfull: string
}

export type SteamOwnedGame = {
  appid: number
  name: string
  playtime_forever: number
  rtime_last_played: number
  img_icon_url?: string
}

export async function fetchSteamProfile(steamId64: string): Promise<SteamProfile> {
  const url = `${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${requireEnv('STEAM_API_KEY')}&steamids=${steamId64}`
  const res = await request(url)
  const body = (await res.body.json()) as { response: { players: SteamProfile[] } }
  const player = body.response.players[0]
  if (!player) throw new Error('Steam profile not found')
  return player
}

export async function fetchOwnedGames(steamId64: string): Promise<SteamOwnedGame[]> {
  const url =
    `${STEAM_API}/IPlayerService/GetOwnedGames/v1/` +
    `?key=${requireEnv('STEAM_API_KEY')}` +
    `&steamid=${steamId64}` +
    `&include_appinfo=true` +
    `&include_played_free_games=true`

  const res = await request(url)
  const body = (await res.body.json()) as {
    response: { games?: SteamOwnedGame[] }
  }
  // Perfil precisa estar com "Detalhes do jogo: Público" — senão volta vazio.
  return body.response.games ?? []
}
