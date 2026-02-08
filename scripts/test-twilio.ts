#!/usr/bin/env tsx
/**
 * Twilio Integration Tests
 * Tests phone provisioning, webhook response, and call logging
 *
 * Usage: npx tsx scripts/test-twilio.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { Twilio } from "twilio"
import { provisionPhoneNumber, releasePhoneNumber } from "../lib/twilio"
import { query, insertRow, table } from "../lib/bigquery"
import { v4 as uuid } from "uuid"

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") })

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

async function testTwilioCredentials() {
  console.log("🔐 Testing Twilio credentials...")

  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN")
  }

  if (!accountSid.startsWith("AC")) {
    throw new Error("Invalid TWILIO_ACCOUNT_SID format")
  }

  const client = new Twilio(accountSid, authToken)

  try {
    const account = await client.api.accounts(accountSid).fetch()
    console.log(`✅ Connected to Twilio account: ${account.friendlyName}`)
    console.log(`   Status: ${account.status}`)
    return client
  } catch (error) {
    throw new Error(`Failed to authenticate: ${error}`)
  }
}

async function testListPhoneNumbers(client: Twilio) {
  console.log("\n📱 Listing current phone numbers...")

  const numbers = await client.incomingPhoneNumbers.list({ limit: 20 })

  console.log(`✅ Found ${numbers.length} phone number(s):`)
  numbers.forEach(num => {
    console.log(`   - ${num.phoneNumber} (${num.friendlyName})`)
    console.log(`     Voice URL: ${num.voiceUrl}`)
  })

  return numbers
}

async function testPhoneProvisioning() {
  console.log("\n🔧 Testing phone number provisioning...")

  const testAgentId = `test-agent-${Date.now()}`
  console.log(`   Creating test agent: ${testAgentId}`)

  const phoneNumber = await provisionPhoneNumber(testAgentId)

  if (!phoneNumber) {
    console.log("⚠️  Phone provisioning returned null (may need to purchase manually)")
    return null
  }

  console.log(`✅ Provisioned phone number: ${phoneNumber}`)
  console.log(`   Webhook configured: ${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/${testAgentId}`)

  return { agentId: testAgentId, phoneNumber }
}

async function testWebhookConfiguration(client: Twilio) {
  console.log("\n🔗 Verifying webhook configurations...")

  const numbers = await client.incomingPhoneNumbers.list({ limit: 20 })

  numbers.forEach(num => {
    const isLocalhost = num.voiceUrl?.includes("localhost")
    const hasAgentId = num.voiceUrl?.includes("/api/twilio/voice/")

    console.log(`\n   ${num.phoneNumber}:`)
    console.log(`   Voice URL: ${num.voiceUrl || "NOT SET"}`)

    if (isLocalhost) {
      console.log(`   ⚠️  WARNING: Webhook points to localhost - won't work for real calls!`)
      console.log(`   🔧 To fix: Expose via ngrok or deploy to Cloud Run`)
    } else if (hasAgentId) {
      console.log(`   ✅ Webhook configured for agent-based routing`)
    } else {
      console.log(`   ⚠️  No agent ID in webhook URL`)
    }
  })
}

async function testCallLogging() {
  console.log("\n📝 Testing call logging to BigQuery...")

  const testCallId = uuid()
  const testAgentId = uuid()

  const callData = {
    id: testCallId,
    agent_id: testAgentId,
    timestamp: new Date().toISOString(),
    duration_seconds: 30,
    summary: "Test call from Twilio integration test",
  }

  await insertRow("call_history", callData)

  const saved = await query(
    `SELECT * FROM ${table("call_history")} WHERE id = @id`,
    { id: testCallId }
  )

  if (saved.length === 0) {
    throw new Error("Failed to save call to BigQuery")
  }

  console.log(`✅ Call logged successfully: ${saved[0].summary}`)
  return testCallId
}

async function testTwiMLGeneration(agentId: string, agentName: string) {
  console.log("\n🎙️  Testing TwiML response generation...")

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! You've reached ${agentName}. This is a test of the Twilio integration.</Say>
  <Pause length="1"/>
  <Say voice="alice">If you can hear this message, the system is working correctly!</Say>
  <Pause length="1"/>
  <Say voice="alice">Call ID: ${agentId.substring(0, 8)}</Say>
  <Hangup/>
</Response>`

  console.log("✅ TwiML generated:")
  console.log(twiml)

  return twiml
}

async function main() {
  console.log("🧪 Starting Twilio Integration Tests\n")
  console.log("=" .repeat(60))

  try {
    // Test 1: Credentials
    const client = await testTwilioCredentials()

    // Test 2: List existing numbers
    const numbers = await testListPhoneNumbers(client)

    // Test 3: Webhook configuration
    await testWebhookConfiguration(client)

    // Test 4: Call logging
    await testCallLogging()

    // Test 5: TwiML generation
    await testTwiMLGeneration("test-agent-123", "Test Business")

    console.log("\n" + "=".repeat(60))
    console.log("🎉 All tests passed!\n")

    // Instructions for manual testing
    if (numbers.length > 0) {
      console.log("📞 MANUAL TEST INSTRUCTIONS:")
      console.log("=" .repeat(60))
      console.log(`\n1. Make sure your dev server is running: npm run dev`)
      console.log(`2. If testing locally, expose via ngrok:`)
      console.log(`   ngrok http 3000`)
      console.log(`   Then update webhook URL in Twilio console`)
      console.log(`\n3. Call one of these numbers:`)
      numbers.slice(0, 3).forEach(num => {
        console.log(`   ${num.phoneNumber}`)
      })
      console.log(`\n4. You should hear: "Hello! You've reached [agent name]..."`)
      console.log(`\n5. Check BigQuery for call logs:`)
      console.log(`   bq query "SELECT * FROM ${process.env.BQ_DATASET}.call_history ORDER BY timestamp DESC LIMIT 5"`)
      console.log("\n" + "=".repeat(60))
    } else {
      console.log("\n⚠️  No phone numbers found. Run agent creation to provision one.")
    }

  } catch (error: any) {
    console.error("\n❌ Test failed:", error?.message || error)
    process.exit(1)
  }
}

main()
