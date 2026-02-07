import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/firebase-admin"
import { query, insertRow, table } from "@/lib/bigquery"
import { v4 as uuid } from "uuid"
import type { UserDocument } from "@/lib/types"

/**
 * POST /api/upload — upload document files for an agent
 * Accepts multipart form data with files + agentId field.
 * Stores raw text in BigQuery (for txt files).
 * For PDFs: marks ocr_status="pending" — OLM-OCR pipeline will process later.
 * Embedding vectors are generated asynchronously (placeholder).
 */
export async function POST(req: NextRequest) {
  const uid = await verifyToken(req.headers.get("authorization"))
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const agentId = formData.get("agentId") as string
  const files = formData.getAll("files") as File[]

  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 })
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file is required" }, { status: 400 })
  }

  // Verify agent ownership
  const agentCheck = await query(
    `SELECT id FROM ${table("agents")} WHERE id = @agentId AND user_id = @uid LIMIT 1`,
    { agentId, uid }
  )
  if (agentCheck.length === 0) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  }

  const documents: UserDocument[] = []

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    const isPdf = ext === "pdf"
    const isTxt = ext === "txt"

    let rawText: string | null = null
    if (isTxt) {
      rawText = buffer.toString("utf-8")
    }
    // For .doc/.docx: could add parser here; for now treat as binary
    // For .pdf: OLM-OCR pipeline will extract text

    const doc: UserDocument = {
      id: uuid(),
      user_id: uid,
      agent_id: agentId,
      file_name: file.name,
      file_type: ext,
      file_size_bytes: file.size,
      raw_text: rawText,
      embedding: null, // Will be filled by embedding pipeline
      uploaded_at: new Date().toISOString(),
      ocr_status: isPdf ? "pending" : isTxt ? "completed" : "skipped",
    }

    documents.push(doc)
  }

  // Insert all docs (without embedding column — BQ doesn't support array insert via streaming for FLOAT64 REPEATED)
  for (const doc of documents) {
    await insertRow("user_documents", {
      id: doc.id,
      user_id: doc.user_id,
      agent_id: doc.agent_id,
      file_name: doc.file_name,
      file_type: doc.file_type,
      file_size_bytes: doc.file_size_bytes,
      raw_text: doc.raw_text,
      uploaded_at: doc.uploaded_at,
      ocr_status: doc.ocr_status,
    })
  }

  // TODO: Trigger embedding generation pipeline
  // await generateEmbeddings(documents)

  // TODO: Trigger OLM-OCR pipeline for PDF files
  // const pdfDocs = documents.filter(d => d.file_type === 'pdf')
  // if (pdfDocs.length > 0) {
  //   await triggerOlmOcr(pdfDocs)
  // }

  return NextResponse.json({
    uploaded: documents.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      ocr_status: d.ocr_status,
    })),
  }, { status: 201 })
}
