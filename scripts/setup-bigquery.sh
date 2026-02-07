#!/bin/bash
# BigQuery setup script for SayOps
# Run this once to create the dataset and all tables.
# Requires: gcloud CLI authenticated with application-default credentials.

set -e

PROJECT_ID="${GCP_PROJECT_ID:-evently-486001}"
DATASET="sayops"

echo "Setting up BigQuery dataset '$DATASET' in project '$PROJECT_ID'..."

# Create dataset (ignore if already exists)
bq mk --dataset --location=US "$PROJECT_ID:$DATASET" 2>/dev/null || echo "Dataset '$DATASET' already exists."

# Users table
echo "Creating users table..."
bq mk --table "$PROJECT_ID:$DATASET.users" \
  id:STRING,business_name:STRING,email:STRING,created_at:TIMESTAMP \
  2>/dev/null || echo "Table 'users' already exists."

# Agents table
echo "Creating agents table..."
bq mk --table "$PROJECT_ID:$DATASET.agents" \
  id:STRING,user_id:STRING,name:STRING,status:STRING,created_at:TIMESTAMP,total_calls:INTEGER,token_usage:INTEGER,money_spent:FLOAT,max_call_time:INTEGER,context:STRING,cellular_enabled:BOOLEAN \
  2>/dev/null || echo "Table 'agents' already exists."

# Call history table
echo "Creating call_history table..."
bq mk --table "$PROJECT_ID:$DATASET.call_history" \
  id:STRING,agent_id:STRING,timestamp:TIMESTAMP,duration_seconds:INTEGER,summary:STRING \
  2>/dev/null || echo "Table 'call_history' already exists."

# Conversation turns table
echo "Creating conversation_turns table..."
bq mk --table "$PROJECT_ID:$DATASET.conversation_turns" \
  id:STRING,call_id:STRING,turn_order:INTEGER,speaker:STRING,text:STRING,audio_url:STRING \
  2>/dev/null || echo "Table 'conversation_turns' already exists."

# Daily call stats table
echo "Creating daily_call_stats table..."
bq mk --table "$PROJECT_ID:$DATASET.daily_call_stats" \
  date:DATE,agent_id:STRING,call_count:INTEGER \
  2>/dev/null || echo "Table 'daily_call_stats' already exists."

# User documents table (for uploaded files + vector search)
echo "Creating user_documents table..."
bq mk --table "$PROJECT_ID:$DATASET.user_documents" \
  id:STRING,user_id:STRING,agent_id:STRING,file_name:STRING,file_type:STRING,file_size_bytes:INTEGER,raw_text:STRING,uploaded_at:TIMESTAMP,ocr_status:STRING \
  2>/dev/null || echo "Table 'user_documents' already exists."

# Add embedding column via SQL (FLOAT64 REPEATED for vector search)
echo "Adding embedding column to user_documents (if not exists)..."
bq query --use_legacy_sql=false \
  "ALTER TABLE \`$PROJECT_ID.$DATASET.user_documents\` ADD COLUMN IF NOT EXISTS embedding ARRAY<FLOAT64>" \
  2>/dev/null || echo "Embedding column may already exist."

# Create vector search index on embeddings
echo "Creating vector search index (if not exists)..."
bq query --use_legacy_sql=false "
CREATE VECTOR INDEX IF NOT EXISTS idx_user_documents_embedding
ON \`$PROJECT_ID.$DATASET.user_documents\`(embedding)
OPTIONS(
  index_type = 'IVF',
  distance_type = 'COSINE',
  ivf_options = '{\"num_lists\": 100}'
)
" 2>/dev/null || echo "Vector index may already exist or table is too small."

echo ""
echo "BigQuery setup complete!"
echo ""
echo "Tables created in $PROJECT_ID.$DATASET:"
bq ls "$PROJECT_ID:$DATASET"
