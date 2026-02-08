import { NextRequest, NextResponse } from "next/server"
import { query, table, insertRow } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"

/**
 * POST /api/twilio/voice/[agentId]
 * Twilio webhook endpoint for incoming voice calls.
 * This handles calls to agent-specific phone numbers.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const agentId = params.agentId

  console.log(`[Twilio Webhook] Incoming call for agent: ${agentId}`)

  // Verify agent exists
  const agents = await query(
    `SELECT id, name, context FROM ${table("agents")} WHERE id = @agentId LIMIT 1`,
    { agentId }
  )

  if (agents.length === 0) {
    console.log(`[Twilio Webhook] Agent not found: ${agentId}`)
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this agent is not available.</Say>
  <Hangup/>
</Response>`,
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    )
  }

  // Parse Twilio request params
  const formData = await req.formData()
  const callSid = formData.get("CallSid") as string
  const from = formData.get("From") as string
  const to = formData.get("To") as string
  const callStatus = formData.get("CallStatus") as string

  console.log(`[Twilio Webhook] Call details:`, {
    callSid,
    from,
    to,
    callStatus,
    agent: agents[0].name
  })

  // Log call to BigQuery
  const callId = uuid()
  await insertRow("call_history", {
    id: callId,
    agent_id: agentId,
    timestamp: new Date().toISOString(),
    duration_seconds: 0, // Will be updated on call end
    summary: `Incoming call from ${from} to ${agents[0].name}`,
  })

  console.log(`[Twilio Webhook] Call logged to BigQuery: ${callId}`)

  // Return TwiML response
  // TODO: Integrate with AI agent for dynamic conversation
  const agentName = agents[0].name
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! You've reached ${agentName}.</Say>
  <Pause length="1"/>
  <Say voice="alice">This is a test of the Twilio integration. Your call is being logged to the system.</Say>
  <Pause length="1"/>
  <Say voice="alice">Agent context: ${agents[0].context ? agents[0].context.substring(0, 100) : 'No context provided'}.</Say>
  <Pause length="1"/>
  <Say voice="alice">Thank you for testing. Full AI conversation coming soon. Goodbye!</Say>
  <Hangup/>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  })
}
