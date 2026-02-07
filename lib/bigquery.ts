import { BigQuery } from "@google-cloud/bigquery"

const projectId = process.env.GCP_PROJECT_ID || "evently-486001"
const dataset = process.env.BQ_DATASET || "sayops"

// Uses ADC automatically (gcloud auth application-default login)
const bigquery = new BigQuery({ projectId })

/** Run a parameterized query and return typed rows. */
export async function query<T>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
  const [rows] = await bigquery.query({
    query: sql,
    params,
    location: "US",
  })
  return rows as T[]
}

/** Insert rows into a table. */
export async function insertRows(table: string, rows: Record<string, unknown>[]) {
  await bigquery.dataset(dataset).table(table).insert(rows)
}

/** Insert a single row into a table. */
export async function insertRow(table: string, row: Record<string, unknown>) {
  await insertRows(table, [row])
}

/** Helper to build fully qualified table name. */
export function table(name: string) {
  return `\`${projectId}.${dataset}.${name}\``
}

export { bigquery, dataset, projectId }
