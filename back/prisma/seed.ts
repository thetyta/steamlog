import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'userdemo@email.com'
const DEMO_PASSWORD = 'senha1234'

const games = [
  { steamAppId: 367520, name: 'Hollow Knight', genres: ['Metroidvania', 'Indie', 'Action', 'Adventure'], avgPlaytimeHours: 27, summary: 'Aventura de ação 2D desenhada à mão num vasto reino subterrâneo de insetos.' },
  { steamAppId: 413150, name: 'Stardew Valley', genres: ['Simulation', 'RPG', 'Indie'], avgPlaytimeHours: 52, summary: 'Você herda a fazenda do seu avô e constrói uma nova vida no campo.' },
  { steamAppId: 1145360, name: 'Hades', genres: ['Action', 'Roguelike', 'Indie'], avgPlaytimeHours: 22, summary: 'Roguelike de ação onde você desafia os deuses do Olimpo pra escapar do submundo.' },
  { steamAppId: 504230, name: 'Celeste', genres: ['Platformer', 'Indie'], avgPlaytimeHours: 8, summary: 'Plataforma desafiador sobre escalar uma montanha e enfrentar a própria ansiedade.' },
  { steamAppId: 620, name: 'Portal 2', genres: ['Puzzle', 'Action'], avgPlaytimeHours: 12, summary: 'Quebra-cabeças em primeira pessoa com a icônica arma de portais.' },
  { steamAppId: 105600, name: 'Terraria', genres: ['Sandbox', 'Adventure', 'Indie'], avgPlaytimeHours: 90, summary: 'Sandbox 2D de exploração, construção e combate.' },
  { steamAppId: 646570, name: 'Slay the Spire', genres: ['Card Game', 'Roguelike', 'Strategy', 'Indie'], avgPlaytimeHours: 75, summary: 'Roguelike de deckbuilding: monte um baralho e escale a torre.' },
  { steamAppId: 632470, name: 'Disco Elysium', genres: ['RPG', 'Adventure', 'Indie'], avgPlaytimeHours: 21, summary: 'RPG de investigação narrativo, sem combate, focado em diálogo e escolhas.' },
]

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      displayName: 'Professor Demo',
    },
  })

  const created = []
  for (const g of games) {
    const game = await prisma.game.upsert({
      where: { steamAppId: g.steamAppId },
      update: {
        name: g.name,
        summary: g.summary,
        avgPlaytimeHours: g.avgPlaytimeHours,
        genres: { connectOrCreate: g.genres.map((name) => ({ where: { name }, create: { name } })) },
      },
      create: {
        steamAppId: g.steamAppId,
        name: g.name,
        summary: g.summary,
        avgPlaytimeHours: g.avgPlaytimeHours,
        genres: { connectOrCreate: g.genres.map((name) => ({ where: { name }, create: { name } })) },
      },
    })
    created.push(game)
  }

  // Algumas entradas de biblioteca pro usuário demo (alimenta /library e /stats)
  const libraryData = [
    { game: created[0], status: 'COMPLETED' as const, playtimeMinutes: 1620, userRating: 5 },
    { game: created[1], status: 'PLAYING' as const, playtimeMinutes: 3120 },
    { game: created[2], status: 'PLAYING' as const, playtimeMinutes: 1340, userRating: 5 },
    { game: created[3], status: 'COMPLETED' as const, playtimeMinutes: 480, userRating: 4 },
    { game: created[4], status: 'BACKLOG' as const, playtimeMinutes: 0 },
  ]
  for (const entry of libraryData) {
    await prisma.libraryEntry.upsert({
      where: { userId_gameId: { userId: demo.id, gameId: entry.game.id } },
      update: { status: entry.status, playtimeMinutes: entry.playtimeMinutes, userRating: entry.userRating ?? null },
      create: {
        userId: demo.id,
        gameId: entry.game.id,
        status: entry.status,
        playtimeMinutes: entry.playtimeMinutes,
        userRating: entry.userRating ?? null,
      },
    })
  }

  // Uma coleção de exemplo
  await prisma.collection.upsert({
    where: { userId_name: { userId: demo.id, name: 'Favoritos' } },
    update: {},
    create: {
      userId: demo.id,
      name: 'Favoritos',
      description: 'Jogos que eu recomendo de olhos fechados',
      games: { connect: [{ id: created[0].id }, { id: created[2].id }] },
    },
  })

  // Uma tag de exemplo
  await prisma.tag.upsert({
    where: { userId_name: { userId: demo.id, name: 'relaxar' } },
    update: {},
    create: {
      userId: demo.id,
      name: 'relaxar',
      color: '#7dd3fc',
      games: { connect: [{ id: created[1].id }] },
    },
  })

  // Uma sessão de jogo de exemplo (id fixo pra ser idempotente)
  await prisma.playSession.upsert({
    where: { id: 'seed-session-1' },
    update: {},
    create: {
      id: 'seed-session-1',
      userId: demo.id,
      gameId: created[2].id,
      durationMinutes: 95,
      rating: 5,
      note: 'Run perfeita até o Hades final.',
    },
  })

  console.log(`Seed concluído. Login demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
