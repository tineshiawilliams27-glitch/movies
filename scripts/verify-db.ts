import { Pool } from 'pg'

type TableRequirement = {
  name: string
  columns: string[]
}

const requirements: TableRequirement[] = [
  { name: 'user', columns: ['id', 'email'] },
  { name: 'session', columns: ['id', 'userId', 'expiresAt'] },
  { name: 'account', columns: ['id', 'userId', 'providerId'] },
  { name: 'verification', columns: ['id', 'identifier', 'expiresAt'] },
  { name: 'projects', columns: ['id', 'userId', 'title'] },
  { name: 'characters', columns: ['id', 'projectId', 'name'] },
  { name: 'scenes', columns: ['id', 'projectId', 'sceneNumber'] },
  { name: 'media_assets', columns: ['id', 'projectId', 'sourceId', 'version'] },
  { name: 'generation_jobs', columns: ['id', 'projectId', 'generationRunId', 'status'] },
  { name: 'generation_outbox', columns: ['id', 'jobId', 'eventType'] },
  { name: 'generation_runs', columns: ['id', 'projectId', 'userId', 'version'] },
  { name: 'film_bibles', columns: ['id', 'projectId', 'generationRunId', 'version'] },
  { name: 'film_characters', columns: ['id', 'projectId', 'generationRunId', 'version'] },
  { name: 'storyboard_shots', columns: ['id', 'projectId', 'generationRunId', 'version'] },
  { name: 'timeline_items', columns: ['id', 'projectId', 'generationRunId', 'version'] },
]

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const tableRows = await pool.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [requirements.map(({ name }) => name)])
  const existingTables = new Set(tableRows.rows.map(({ table_name }) => table_name))
  const columnRows = await pool.query<{ table_name: string; column_name: string }>(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
  `, [requirements.map(({ name }) => name)])
  const existingColumns = new Map<string, Set<string>>()

  for (const { table_name: table, column_name: column } of columnRows.rows) {
    const columns = existingColumns.get(table) ?? new Set<string>()
    columns.add(column)
    existingColumns.set(table, columns)
  }

  const failures: string[] = []
  for (const requirement of requirements) {
    if (!existingTables.has(requirement.name)) {
      failures.push(`Missing table: ${requirement.name}`)
      continue
    }

    for (const column of requirement.columns) {
      if (!existingColumns.get(requirement.name)?.has(column)) {
        failures.push(`Missing column: ${requirement.name}.${column}`)
      }
    }
  }

  if (failures.length > 0) {
    console.error('Database verification failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exitCode = 1
  } else {
    console.log(`Database verification passed: ${requirements.length} tables and critical columns verified.`)
  }
  await pool.end()
}

main().catch(async (error: unknown) => {
  console.error('Database verification could not run:', error)
  await pool.end()
  process.exitCode = 1
})
