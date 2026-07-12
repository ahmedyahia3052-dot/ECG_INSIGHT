/**
 * Epic 21 — Live ECG session + SSE sample stream + device ingest.
 * Streams real digitized case waveforms or device-ingested samples.
 * No synthetic ECG generation.
 */
import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../config/prisma"
import { requireAuth, requireRole } from "../../middleware/auth"
import { AppError } from "../../middleware/error"
import { validateBody } from "../../middleware/validate"
import { canAccessCase } from "../../utils/resource-access"
import { emitRealtime } from "../../realtime/realtime.service"
import { getViewerWaveform } from "../ecg-viewer-api/ecg-viewer-api.service"
import { getProcessedWaveform } from "../ecg-processing/ecg-processing.service"

export const liveEcgRouter = Router()

type LeadSamples = { lead: string; samples: number[]; samplingRate: number }

type LiveSession = {
  id: string
  caseId: string
  patientId?: string
  mode: "case_telemetry" | "device_ingest"
  createdAt: number
  sampleRateHz: number
  leads: LeadSamples[]
  cursor: number
  chunkSize: number
  loop: boolean
  lastIngestAt?: number
  deviceId?: string
}

const sessions = new Map<string, LiveSession>()

const startSchema = z.object({
  caseId: z.string().min(1),
  loop: z.boolean().optional().default(true),
  chunkSize: z.number().int().min(8).max(2000).optional().default(125),
})

const ingestSchema = z.object({
  deviceId: z.string().min(1),
  sampleRateHz: z.number().positive(),
  leads: z
    .array(
      z.object({
        lead: z.string().min(1),
        samples: z.array(z.number()).min(1),
      }),
    )
    .min(1),
  caseId: z.string().optional(),
  patientId: z.string().optional(),
})

function newSessionId() {
  return `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

async function loadCaseLeads(caseId: string, auth: { id: string; role: string }): Promise<LeadSamples[]> {
  try {
    const waveform = await getViewerWaveform(caseId, auth as never, { maxSeconds: 120 })
    const list = Array.isArray(waveform) ? waveform : [waveform]
    if (list.length && list[0].samples?.length) {
      return list.map((w) => ({
        lead: w.lead,
        samples: w.samples,
        samplingRate: w.samplingRate || 500,
      }))
    }
  } catch {
    /* fall through to processed single-lead */
  }

  const processed = await getProcessedWaveform(caseId)
  if (!processed.points?.length) {
    throw new AppError(404, "No digitized waveform available for live session.", "LIVE_WAVEFORM_MISSING")
  }
  return [
    {
      lead: "II",
      samples: processed.points.map((p) => p.v),
      samplingRate: processed.sampleRate || 500,
    },
  ]
}

liveEcgRouter.use(requireAuth)

liveEcgRouter.post("/sessions", requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN", "TECHNICIAN", "OWNER", "ORGANIZATION_ADMIN"), validateBody(startSchema), async (req, res, next) => {
  try {
    const { caseId, loop, chunkSize } = req.body as z.infer<typeof startSchema>
    const ecgCase = await prisma.eCGCase.findFirst({
      where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
    })
    if (!ecgCase || !(await canAccessCase(ecgCase.id, req.auth!))) {
      throw new AppError(404, "Case not found or access denied.", "CASE_NOT_FOUND")
    }
    const leads = await loadCaseLeads(ecgCase.id, req.auth!)
    const session: LiveSession = {
      id: newSessionId(),
      caseId: ecgCase.id,
      patientId: ecgCase.patientId,
      mode: "case_telemetry",
      createdAt: Date.now(),
      sampleRateHz: leads[0]?.samplingRate || 500,
      leads,
      cursor: 0,
      chunkSize,
      loop,
    }
    sessions.set(session.id, session)
    res.status(201).json({
      session: {
        id: session.id,
        caseId: session.caseId,
        patientId: session.patientId,
        mode: session.mode,
        sampleRateHz: session.sampleRateHz,
        leadNames: session.leads.map((l) => l.lead),
        totalSamples: Math.max(...session.leads.map((l) => l.samples.length)),
        chunkSize: session.chunkSize,
        loop: session.loop,
        streamPath: `/live-ecg/sessions/${session.id}/stream`,
      },
    })
  } catch (error) {
    next(error)
  }
})

liveEcgRouter.post("/sessions/device", requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN", "TECHNICIAN", "OWNER"), validateBody(ingestSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof ingestSchema>
    if (body.caseId) {
      const ok = await canAccessCase(body.caseId, req.auth!)
      if (!ok) throw new AppError(403, "Case access denied.", "FORBIDDEN")
    }
    const session: LiveSession = {
      id: newSessionId(),
      caseId: body.caseId || `device_${body.deviceId}`,
      patientId: body.patientId,
      mode: "device_ingest",
      createdAt: Date.now(),
      sampleRateHz: body.sampleRateHz,
      leads: body.leads.map((l) => ({ lead: l.lead, samples: [...l.samples], samplingRate: body.sampleRateHz })),
      cursor: 0,
      chunkSize: 125,
      loop: false,
      deviceId: body.deviceId,
      lastIngestAt: Date.now(),
    }
    sessions.set(session.id, session)
    res.status(201).json({
      session: {
        id: session.id,
        mode: session.mode,
        deviceId: session.deviceId,
        sampleRateHz: session.sampleRateHz,
        leadNames: session.leads.map((l) => l.lead),
        streamPath: `/live-ecg/sessions/${session.id}/stream`,
      },
    })
  } catch (error) {
    next(error)
  }
})

liveEcgRouter.post("/sessions/:sessionId/ingest", requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN", "TECHNICIAN", "OWNER"), validateBody(ingestSchema), async (req, res, next) => {
  try {
    const session = sessions.get(String(req.params.sessionId))
    if (!session) throw new AppError(404, "Live session not found.", "SESSION_NOT_FOUND")
    const body = req.body as z.infer<typeof ingestSchema>
    for (const incoming of body.leads) {
      const existing = session.leads.find((l) => l.lead === incoming.lead)
      if (existing) existing.samples.push(...incoming.samples)
      else session.leads.push({ lead: incoming.lead, samples: [...incoming.samples], samplingRate: body.sampleRateHz })
    }
    session.sampleRateHz = body.sampleRateHz
    session.lastIngestAt = Date.now()
    session.mode = "device_ingest"
    session.deviceId = body.deviceId
    emitRealtime("alert.created" as never, { type: "live.ecg.ingest", sessionId: session.id, deviceId: body.deviceId }, [
      `case:${session.caseId}`,
    ])
    res.json({ ok: true, bufferedSamples: Math.max(...session.leads.map((l) => l.samples.length)) })
  } catch (error) {
    next(error)
  }
})

liveEcgRouter.get("/sessions/:sessionId", async (req, res, next) => {
  try {
    const session = sessions.get(String(req.params.sessionId))
    if (!session) throw new AppError(404, "Live session not found.", "SESSION_NOT_FOUND")
    res.json({
      session: {
        id: session.id,
        caseId: session.caseId,
        patientId: session.patientId,
        mode: session.mode,
        sampleRateHz: session.sampleRateHz,
        cursor: session.cursor,
        leadNames: session.leads.map((l) => l.lead),
        totalSamples: Math.max(...session.leads.map((l) => l.samples.length)),
        deviceId: session.deviceId,
        lastIngestAt: session.lastIngestAt,
      },
    })
  } catch (error) {
    next(error)
  }
})

function nextChunk(session: LiveSession) {
  const maxLen = Math.max(...session.leads.map((l) => l.samples.length), 0)
  if (maxLen === 0) {
    return { done: true as const, leads: [] as Array<{ lead: string; samples: number[] }>, cursor: session.cursor }
  }
  if (session.cursor >= maxLen) {
    if (session.loop && session.mode === "case_telemetry") session.cursor = 0
    else return { done: true as const, leads: [], cursor: session.cursor }
  }
  const start = session.cursor
  const end = Math.min(maxLen, start + session.chunkSize)
  const leads = session.leads.map((l) => ({
    lead: l.lead,
    samples: l.samples.slice(start, Math.min(end, l.samples.length)),
  }))
  session.cursor = end
  return {
    done: false as const,
    sequence: start,
    sampleRateHz: session.sampleRateHz,
    t0: start / session.sampleRateHz,
    leads,
    cursor: session.cursor,
  }
}

liveEcgRouter.get("/sessions/:sessionId/chunk", async (req, res, next) => {
  try {
    const session = sessions.get(String(req.params.sessionId))
    if (!session) throw new AppError(404, "Live session not found.", "SESSION_NOT_FOUND")
    res.json({ chunk: nextChunk(session) })
  } catch (error) {
    next(error)
  }
})

/** SSE real-time sample stream */
liveEcgRouter.get("/sessions/:sessionId/stream", async (req, res, next) => {
  try {
    const session = sessions.get(String(req.params.sessionId))
    if (!session) throw new AppError(404, "Live session not found.", "SESSION_NOT_FOUND")

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.flushHeaders?.()

    const intervalMs = Math.max(20, Math.round((1000 * session.chunkSize) / session.sampleRateHz))
    const timer = setInterval(() => {
      const chunk = nextChunk(session)
      res.write(`event: chunk\ndata: ${JSON.stringify(chunk)}\n\n`)
      if (chunk.done && session.mode === "device_ingest") {
        clearInterval(timer)
        res.write(`event: end\ndata: {}\n\n`)
        res.end()
      }
    }, intervalMs)

    req.on("close", () => {
      clearInterval(timer)
    })
  } catch (error) {
    next(error)
  }
})

liveEcgRouter.delete("/sessions/:sessionId", async (req, res, next) => {
  try {
    sessions.delete(String(req.params.sessionId))
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
