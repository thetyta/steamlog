'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { api, ApiError } from '@/lib/api'

export type RecommendationState = { error?: string }

const createSchema = z.object({
  mood: z.string().trim().min(1, 'Descreva como você está / o que procura').max(200),
  timeAvailable: z.string().trim().max(100).optional(),
  context: z.string().trim().max(500).optional(),
})

const feedbackSchema = z.enum(['LIKED', 'DISLIKED', 'PLAYED', 'SKIPPED'])

/** ApiError carrega o body cru do back, que costuma ser `{"error":"..."}`. */
function readApiError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      const parsed = JSON.parse(e.message) as { error?: string }
      if (parsed?.error) return parsed.error
    } catch {
      if (e.message) return e.message
    }
  }
  return fallback
}

export async function createRecommendationAction(
  _prev: RecommendationState,
  formData: FormData,
): Promise<RecommendationState> {
  const timeAvailable = formData.get('timeAvailable')
  const context = formData.get('context')

  const parsed = createSchema.safeParse({
    mood: formData.get('mood'),
    timeAvailable: timeAvailable ? String(timeAvailable) : undefined,
    context: context ? String(context) : undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  let id: string
  try {
    const rec = await api<{ id: string }>('/recommendations', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    })
    id = rec.id
  } catch (e) {
    return { error: readApiError(e, 'Não foi possível gerar a recomendação.') }
  }

  redirect(`/recommendations/${id}`)
}

export type FeedbackResult = { ok: true } | { ok: false; error: string }

export async function sendFeedbackAction(
  itemId: string,
  feedback: z.infer<typeof feedbackSchema>,
): Promise<FeedbackResult> {
  const parsed = feedbackSchema.safeParse(feedback)
  if (!parsed.success) return { ok: false, error: 'Feedback inválido' }

  try {
    await api(`/recommendations/items/${itemId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback: parsed.data }),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: readApiError(e, 'Não foi possível salvar o feedback.') }
  }
}
