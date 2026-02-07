import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, table } from "@/lib/bigquery"
import type { CallHistoryEntry, ConversationTurn } from "@/lib/types"

/** GET /api/agents/:agentId/calls/:callId — get a single call with conversation */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string; callId: string }> }
) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { agentId, callId } = await params

  // Verify agent ownership
  const agentCheck = await query(
    `SELECT id FROM ${table("agents")} WHERE id = @agentId AND user_id = @uid LIMIT 1`,
    { agentId, uid }
  )
  if (agentCheck.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const calls = await query<CallHistoryEntry>(
    `SELECT * FROM ${table("call_history")} WHERE id = @callId AND agent_id = @agentId LIMIT 1`,
    { callId, agentId }
  )

  if (calls.length === 0) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 })
  }

  const turns = await query<ConversationTurn>(
    `SELECT * FROM ${table("conversation_turns")} WHERE call_id = @callId ORDER BY turn_order ASC`,
    { callId }
  )

  return NextResponse.json({ ...calls[0], conversation: turns })
}
