import { request } from 'undici'

const APPDETAILS_URL = 'https://store.steampowered.com/api/appdetails'
const STORESEARCH_URL = 'https://store.steampowered.com/api/storesearch'

type StoreSearchResponse = {
  total: number
  items?: { type: string; name: string; id: number }[]
}

/**
 * Resolve um nome de jogo para o steamAppId via busca da loja.
 * Tolerante a falha: retorna `null` em qualquer erro (não quebra a recomendação).
 */
export async function searchSteamAppId(name: string): Promise<number | null> {
  try {
    const url = `${STORESEARCH_URL}/?term=${encodeURIComponent(name)}&cc=br&l=portuguese`
    const res = await request(url, { headers: { 'Accept-Language': 'pt-BR' } })
    if (res.statusCode >= 400) return null
    const body = (await res.body.json()) as StoreSearchResponse
    const first = body.items?.find((i) => i.type === 'app') ?? body.items?.[0]
    return first?.id ?? null
  } catch {
    return null
  }
}

export type SteamStoreScreenshot = { thumb: string; full: string }

export type SteamStoreDetails = {
  name: string
  isFree: boolean
  priceCents: number | null
  headerImageUrl: string | null
  detailedSummary: string | null
  screenshots: SteamStoreScreenshot[]
}

type AppDetailsResponse = Record<
  string,
  {
    success: boolean
    data?: {
      name: string
      is_free: boolean
      header_image?: string
      detailed_description?: string
      short_description?: string
      price_overview?: { final: number; currency: string }
      screenshots?: { path_thumbnail: string; path_full: string }[]
    }
  }
>

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function fetchAppDetails(steamAppId: number): Promise<SteamStoreDetails | null> {
  const url = `${APPDETAILS_URL}?appids=${steamAppId}&l=portuguese&cc=br`
  const res = await request(url, { headers: { 'Accept-Language': 'pt-BR' } })

  if (res.statusCode === 429) {
    throw new Error('Steam Store rate limit (429) — tente novamente em alguns minutos')
  }
  if (res.statusCode >= 400) {
    throw new Error(`Steam Store ${res.statusCode}`)
  }

  const body = (await res.body.json()) as AppDetailsResponse
  const entry = body[String(steamAppId)]
  if (!entry?.success || !entry.data) return null

  const d = entry.data
  return {
    name: d.name,
    isFree: d.is_free ?? false,
    priceCents: d.price_overview?.final ?? null,
    headerImageUrl: d.header_image ?? null,
    detailedSummary: d.short_description
      ? d.short_description
      : d.detailed_description
        ? stripHtml(d.detailed_description).slice(0, 3000)
        : null,
    screenshots:
      d.screenshots?.slice(0, 8).map((s) => ({
        thumb: s.path_thumbnail,
        full: s.path_full,
      })) ?? [],
  }
}
