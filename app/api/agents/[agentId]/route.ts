import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, table, bigquery, dataset } from "@/lib/bigquery"
import type { Agent } from "@/lib/types"

/** GET /api/agents/:agentId — get a single agent */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { agentId } = await params

  const agents = await query<Agent>(
    `SELECT * FROM ${table("agents")} WHERE id = @agentId AND user_id = @uid LIMIT 1`,
    { agentId, uid }
  )

  if (agents.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  return NextResponse.json(agents[0])
}

/** PUT /api/agents/:agentId — update agent settings */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { agentId } = await params
  const body = await req.json()

  // Verify ownership
  const existing = await query<Agent>(
    `SELECT id FROM ${table("agents")} WHERE id = @agentId AND user_id = @uid LIMIT 1`,
    { agentId, uid }
  )

  if (existing.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  // Build SET clause from allowed fields
  const allowed = ["name", "context", "max_call_time", "cellular_enabled", "status"]
  const updates: string[] = []
  const updateParams: Record<string, unknown> = { agentId, uid }

  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates.push(`${field} = @${field}`)
      updateParams[field] = body[field]
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  await query(
    `UPDATE ${table("agents")} SET ${updates.join(", ")} WHERE id = @agentId AND user_id = @uid`,
    updateParams
  )

  // Return updated agent
  const updated = await query<Agent>(
    `SELECT * FROM ${table("agents")} WHERE id = @agentId LIMIT 1`,
    { agentId }
  )

  return NextResponse.json(updated[0])
}
