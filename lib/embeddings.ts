/**
 * Vector embedding pipeline for document search.
 *
 * This module provides:
 * 1. Text → embedding vector conversion (via Vertex AI text-embedding model)
 * 2. BigQuery vector search queries
 * 3. Placeholder for OLM-OCR PDF text extraction
 *
 * Setup: Ensure Vertex AI API is enabled in your GCP project:
 *   gcloud services enable aiplatform.googleapis.com
 */

import { query, table, bigquery, dataset, projectId } from "@/lib/bigquery"

// ─── Configuration ───────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "text-embedding-005" // Vertex AI text embedding model
const EMBEDDING_DIMENSION = 768 // Dimension for text-embedding-005
const VERTEX_AI_LOCATION = "us-central1"

// ─── Embedding Generation ────────────────────────────────────────────────────

/**
 * Generate embedding vector for a text string using Vertex AI.
 * Uses the Google Cloud AI Platform REST API with ADC.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { GoogleAuth } = await import("google-auth-library")
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] })
  const client = await auth.getClient()

  const url = `https://${VERTEX_AI_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${EMBEDDING_MODEL}:predict`

  const response = await client.request({
    url,
    method: "POST",
    data: {
      instances: [{ content: text }],
    },
  })

  const data = response.data as any
  return data.predictions[0].embeddings.values
}

/**
 * Generate embeddings for multiple texts in batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Process in batches of 5 to avoid rate limits
  const batchSize = 5
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const embeddings = await Promise.all(batch.map(generateEmbedding))
    results.push(...embeddings)
  }

  return results
}

// ─── Vector Search ───────────────────────────────────────────────────────────

/**
 * Search for similar documents using BigQuery VECTOR_SEARCH.
 * Returns document IDs and similarity scores.
 */
export async function vectorSearch(
  queryText: string,
  agentId: string,
  topK: number = 5
): Promise<{ id: string; file_name: string; raw_text: string; distance: number }[]> {
  const queryEmbedding = await generateEmbedding(queryText)

  const results = await query<{
    id: string
    file_name: string
    raw_text: string
    distance: number
  }>(`
    SELECT
      base.id,
      base.file_name,
      base.raw_text,
      distance
    FROM VECTOR_SEARCH(
      TABLE ${table("user_documents")},
      'embedding',
      (SELECT @queryEmbedding AS embedding),
      top_k => @topK,
      distance_type => 'COSINE'
    )
    WHERE base.agent_id = @agentId
    ORDER BY distance ASC
  `, {
    queryEmbedding,
    topK,
    agentId,
  })

  return results
}

// ─── Document Processing Pipeline ────────────────────────────────────────────

/**
 * Process a document: extract text (if PDF via OCR), generate embedding, store in BigQuery.
 * Called after file upload.
 */
export async function processDocument(documentId: string): Promise<void> {
  // 1. Fetch the document record
  const docs = await query<{ id: string; raw_text: string | null; file_type: string; ocr_status: string }>(
    `SELECT id, raw_text, file_type, ocr_status FROM ${table("user_documents")} WHERE id = @documentId`,
    { documentId }
  )

  if (docs.length === 0) return
  const doc = docs[0]

  let text = doc.raw_text

  // 2. If PDF and pending OCR, call OLM-OCR
  if (doc.file_type === "pdf" && doc.ocr_status === "pending") {
    text = await extractTextWithOlmOcr(documentId)
    // Update raw_text and ocr_status
    await query(
      `UPDATE ${table("user_documents")} SET raw_text = @text, ocr_status = 'completed' WHERE id = @documentId`,
      { text, documentId }
    )
  }

  // 3. Generate embedding if we have text
  if (text && text.length > 0) {
    const embedding = await generateEmbedding(text)
    // Update embedding in BigQuery
    await query(
      `UPDATE ${table("user_documents")} SET embedding = @embedding WHERE id = @documentId`,
      { embedding, documentId }
    )
  }
}

// ─── OLM-OCR Placeholder ────────────────────────────────────────────────────

/**
 * PLACEHOLDER: Extract text from PDF using OLM-OCR API.
 *
 * TODO: Replace with actual OLM-OCR API call once the instance is set up.
 * Expected API contract:
 *   POST /api/ocr
 *   Body: { document_id: string, file_url: string }
 *   Response: { text: string, pages: number, status: "completed" }
 */
const OLM_OCR_API_URL = process.env.OLM_OCR_API_URL || "http://localhost:8080/api/ocr"

async function extractTextWithOlmOcr(documentId: string): Promise<string> {
  // TODO: Implement actual OLM-OCR API integration
  // The OLM-OCR instance is being set up by a teammate.
  //
  // Expected implementation:
  // const response = await fetch(OLM_OCR_API_URL, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     document_id: documentId,
  //     // file_url or file_content would go here
  //   }),
  // })
  // const result = await response.json()
  // return result.text

  console.warn(`[OLM-OCR] Placeholder: OCR not yet available for document ${documentId}`)
  return ""
}
