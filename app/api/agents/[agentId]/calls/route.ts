import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, table } from "@/lib/bigquery"
import type { CallHistoryEntry, ConversationTurn } from "@/lib/types"

/** GET /api/agents/:agentId/calls — list call history for an agent */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { agentId } = await params

  // Verify agent ownership
  const agentCheck = await query(
    `SELECT id FROM ${table("agents")} WHERE id = @agentId AND user_id = @uid LIMIT 1`,
    { agentId, uid }
  )
  if (agentCheck.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  // Get calls
  const calls = await query<CallHistoryEntry>(
    `SELECT * FROM ${table("call_history")} WHERE agent_id = @agentId ORDER BY timestamp DESC LIMIT 100`,
    { agentId }
  )

  // For each call, get conversation turns
  const callsWithTurns = await Promise.all(
    calls.map(async (call) => {
      const turns = await query<ConversationTurn>(
        `SELECT * FROM ${table("conversation_turns")} WHERE call_id = @callId ORDER BY turn_order ASC`,
        { callId: call.id }
      )
      return { ...call, conversation: turns }
    })
  )

  return NextResponse.json(callsWithTurns)
}
