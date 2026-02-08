#!/usr/bin/env tsx
import { config } from "dotenv"
import { resolve } from "path"
import { Twilio } from "twilio"

config({ path: resolve(process.cwd(), ".env.local") })

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

async function checkWebhook() {
  const numbers = await client.incomingPhoneNumbers.list()

  console.log("📞 Current Twilio Phone Numbers & Webhooks:\n")

  for (const num of numbers) {
    console.log(`Phone: ${num.phoneNumber}`)
    console.log(`Voice URL: ${num.voiceUrl}`)
    console.log(`Voice Method: ${num.voiceMethod}`)
    console.log(`Status: ${num.status}`)
    console.log("")
  }
}

checkWebhook()
