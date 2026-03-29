jest.mock('../src/db');
jest.mock('../src/audit-log');

import { getDbConnection } from '../src/db';
import { logOperation } from '../src/audit-log';
import { getVirtualBoardData } from '../src/virtual-board';

const mockExecute = jest.fn();
const mockConn = { execute: mockExecute, end: jest.fn().mockResolvedValue(undefined) };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;
const mockLog = logOperation as jest.MockedFunction<typeof logOperation>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
  mockLog.mockResolvedValue(undefined);
});

describe('getVirtualBoardData', () => {
  const boardRows = [
    { code: 'ABC', source: 'stake.us', created_at: '2024-01-01' },
    { code: 'DEF', source: 'selfmade', created_at: '2024-01-02' },
  ];

  test('returns rows from the codes table', async () => {
    mockExecute.mockResolvedValueOnce([boardRows]);
    const result = await getVirtualBoardData();
    expect(result).toEqual(boardRows);
  });

  test('queries with DESC order and LIMIT 50', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await getVirtualBoardData();
    const query = mockExecute.mock.calls[0][0] as string;
    expect(query).toContain('ORDER BY created_at DESC LIMIT 50');
  });

  test('does not call logOperation when userId and serverId are not provided', async () => {
    mockExecute.mockResolvedValueOnce([[]]);
    await getVirtualBoardData();
    expect(mockLog).not.toHaveBeenCalled();
  });

  test('calls logOperation when userId and serverId are both provided', async () => {
    mockExecute.mockResolvedValueOnce([boardRows]);
    await getVirtualBoardData('user1', 'server1');
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user1', serverId: 'server1', action: 'view_virtual_board' })
    );
  });

  test('log message includes row count', async () => {
    mockExecute.mockResolvedValueOnce([boardRows]);
    await getVirtualBoardData('u', 's');
    const details = (mockLog.mock.calls[0][0] as any).details as string;
    expect(details).toContain('2');
  });
});
