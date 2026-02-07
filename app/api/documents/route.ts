import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, table } from "@/lib/bigquery"
import type { UserDocument } from "@/lib/types"

/** GET /api/documents?agentId=xxx — list uploaded documents for an agent */
export async function GET(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const agentId = req.nextUrl.searchParams.get("agentId")
  if (!agentId) {
    return NextResponse.json({ error: "agentId query param required" }, { status: 400 })
  }

  // Verify agent ownership
  const agentCheck = await query(
    `SELECT id FROM ${table("agents")} WHERE id = @agentId AND user_id = @uid LIMIT 1`,
    { agentId, uid }
  )
  if (agentCheck.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const docs = await query<UserDocument>(
    `SELECT id, agent_id, file_name, file_type, file_size_bytes, uploaded_at, ocr_status
     FROM ${table("user_documents")}
     WHERE agent_id = @agentId AND user_id = @uid
     ORDER BY uploaded_at DESC`,
    { agentId, uid }
  )

  return NextResponse.json(docs)
}
