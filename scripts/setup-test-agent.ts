#!/usr/bin/env tsx
/**
 * Creates a test agent and updates Twilio webhook
 */

import { config } from "dotenv"
import { resolve } from "path"
import { Twilio } from "twilio"
import { query, insertRow, table } from "../lib/bigquery"
import { v4 as uuid } from "uuid"

config({ path: resolve(process.cwd(), ".env.local") })

const accountSid = process.env.TWILIO_ACCOUNT_SID!
const authToken = process.env.TWILIO_AUTH_TOKEN!
const phoneNumber = process.env.TWILIO_PHONE_NUMBER!
const ngrokUrl = process.argv[2] // Pass ngrok URL as argument

async function main() {
  console.log("🔧 Setting up test agent for Twilio...\n")

  if (!ngrokUrl) {
    console.error("❌ Usage: npx tsx scripts/setup-test-agent.ts <ngrok-url>")
    process.exit(1)
  }

  // Create test agent
  const agentId = "test-agent-" + Date.now()
  const agent = {
    id: agentId,
    user_id: "test-user",
    name: "Test Support Agent",
    status: "active" as const,
    created_at: new Date().toISOString(),
    total_calls: 0,
    token_usage: 0,
    money_spent: 0,
    max_call_time: 300,
    context: "You are a helpful customer support agent for a tech company. Answer questions about products and services.",
    cellular_enabled: true,
    phone_number: phoneNumber,
  }

  await insertRow("agents", agent)
  console.log(`✅ Created test agent: ${agentId}`)
  console.log(`   Name: ${agent.name}`)
  console.log(`   Phone: ${phoneNumber}`)

  // Update Twilio webhook
  const client = new Twilio(accountSid, authToken)
  const numbers = await client.incomingPhoneNumbers.list()

  const targetNumber = numbers.find(n => n.phoneNumber === phoneNumber)
  if (!targetNumber) {
    console.error(`❌ Phone number ${phoneNumber} not found in Twilio account`)
    process.exit(1)
  }

  const webhookUrl = `${ngrokUrl}/api/twilio/voice/${agentId}`

  await client.incomingPhoneNumbers(targetNumber.sid).update({
    voiceUrl: webhookUrl,
    voiceMethod: "POST",
  })

  console.log(`✅ Updated webhook URL: ${webhookUrl}`)
  console.log(`\n📞 TEST INSTRUCTIONS:`)
  console.log(`   1. Call ${phoneNumber}`)
  console.log(`   2. You should hear: "Hello! You've reached Test Support Agent..."`)
  console.log(`   3. The call will be logged to BigQuery`)
  console.log(`\n🔍 Check logs:`)
  console.log(`   bq query "SELECT * FROM sayops.call_history WHERE agent_id = '${agentId}' ORDER BY timestamp DESC"`)
}

main()
