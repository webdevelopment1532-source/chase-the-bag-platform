jest.mock('../src/db');

import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';

const mockExecute = jest.fn().mockResolvedValue([[]]);
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
});

describe('logOperation', () => {
  test('inserts audit log entry with all provided fields', async () => {
    await logOperation({ userId: 'u1', serverId: 's1', action: 'test_action', details: 'some detail' });
    expect(mockExecute).toHaveBeenCalledWith(
      'INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)',
      ['u1', 's1', 'test_action', 'some detail']
    );
  });

  test('inserts null for details when not provided', async () => {
    await logOperation({ userId: 'u2', serverId: 's2', action: 'no_detail' });
    expect(mockExecute).toHaveBeenCalledWith(
      'INSERT INTO audit_logs (user_id, server_id, action, details) VALUES (?, ?, ?, ?)',
      ['u2', 's2', 'no_detail', null]
    );
  });

  test('obtains a db connection for each call', async () => {
    await logOperation({ userId: 'u3', serverId: 's3', action: 'act' });
    expect(mockGetDb).toHaveBeenCalledTimes(1);
  });
});
