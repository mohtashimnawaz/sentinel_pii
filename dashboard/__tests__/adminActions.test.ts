import { createIngestKey, rotateIngestKey } from '../lib/adminActions'

// Mock client that records queries
class MockClient {
  calls: any[] = []
  async query(sql: string, params?: any[]) {
    this.calls.push({ sql, params })
    if (sql.startsWith('UPDATE')) return { rowCount: 1 }
    return { rowCount: 1 }
  }
}

test('createIngestKey inserts key and audit', async () => {
  const client = new MockClient()
  const token = await createIngestKey(client as any, 'testname', 'admin')
  expect(typeof token).toBe('string')
  // two queries: insert key, insert audit
  expect(client.calls.length).toBe(2)
  expect(client.calls[1].sql).toContain('INSERT INTO audit_logs')
})

test('rotateIngestKey updates key and inserts audit', async () => {
  const client = new MockClient()
  const token = await rotateIngestKey(client as any, 'some-id', 'admin')
  expect(typeof token).toBe('string')
  expect(client.calls.length).toBe(2)
  expect(client.calls[0].sql).toContain('UPDATE ingest_keys')
  expect(client.calls[1].sql).toContain('INSERT INTO audit_logs')
})
