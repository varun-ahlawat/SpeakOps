#!/bin/bash
# Restart ngrok and update Twilio webhook

echo "🔄 Restarting ngrok tunnel..."

# Kill existing ngrok
pkill ngrok
sleep 2

# Start new ngrok
ngrok http 3000 --log=stdout > /tmp/ngrok.log 2>&1 &
sleep 3

# Get new URL
NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL"
    exit 1
fi

echo "✅ ngrok running: $NGROK_URL"

# Update webhook
echo "🔧 Updating Twilio webhook..."
npx tsx scripts/setup-test-agent.ts "$NGROK_URL"

echo ""
echo "🎉 Ready! Call +1 (866) 839-3036"
