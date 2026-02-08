#!/usr/bin/env tsx
/**
 * Real-time call monitor
 * Polls BigQuery for new calls every 2 seconds
 */

import { config } from "dotenv"
import { resolve } from "path"
import { query, table } from "../lib/bigquery"

config({ path: resolve(process.cwd(), ".env.local") })

interface Call {
  id: string
  agent_id: string
  timestamp: string
  duration_seconds: number
  summary: string
}

let lastCheckTime = new Date().toISOString()

async function checkForNewCalls() {
  const calls = await query<Call>(
    `SELECT * FROM ${table("call_history")}
     WHERE timestamp > @lastCheck
     ORDER BY timestamp DESC`,
    { lastCheck: lastCheckTime }
  )

  if (calls.length > 0) {
    console.log(`\n🔔 ${calls.length} new call(s) detected!\n`)
    calls.forEach(call => {
      console.log(`📞 Call ID: ${call.id}`)
      console.log(`   Agent: ${call.agent_id}`)
      console.log(`   Time: ${new Date(call.timestamp).toLocaleTimeString()}`)
      console.log(`   Summary: ${call.summary}`)
      console.log("")
    })
    lastCheckTime = new Date().toISOString()
  }
}

async function main() {
  console.log("👀 Monitoring for incoming calls...")
  console.log("   Press Ctrl+C to stop\n")

  // Check every 2 seconds
  setInterval(async () => {
    try {
      await checkForNewCalls()
      process.stdout.write(".")
    } catch (error: any) {
      console.error("\n❌ Error:", error?.message)
    }
  }, 2000)
}

main()
