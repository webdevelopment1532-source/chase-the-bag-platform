jest.mock('../src/db');
jest.mock('archiver');
jest.mock('fs');

import { getDbConnection } from '../src/db';
import archiver from 'archiver';
import fs from 'fs';
import { exportAllDataZip } from '../src/export-data';

const mockExecute = jest.fn();
const mockConn = { execute: mockExecute };
const mockGetDb = getDbConnection as jest.MockedFunction<typeof getDbConnection>;

const mockPipe = jest.fn();
const mockAppend = jest.fn();
const mockFinalize = jest.fn().mockResolvedValue(undefined);
const mockArchiveFactory = archiver as unknown as jest.Mock;

const mockCreateWriteStream = fs.createWriteStream as unknown as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetDb.mockResolvedValue(mockConn as any);
  mockArchiveFactory.mockReturnValue({
    pipe: mockPipe,
    append: mockAppend,
    finalize: mockFinalize,
  });
  mockCreateWriteStream.mockReturnValue({} as any);
});

describe('exportAllDataZip', () => {
  test('exports all supported tables into zip and returns output path', async () => {
    mockExecute
      .mockResolvedValueOnce([[{ id: 1, code: 'C1' }]])
      .mockResolvedValueOnce([[{ user: 'u1', score: 10 }]])
      .mockResolvedValueOnce([[{ user_id: 'u1', status: 'active' }]])
      .mockResolvedValueOnce([[{ action: 'x' }]]);

    const path = await exportAllDataZip('backup.zip');

    expect(path).toBe('backup.zip');
    expect(mockCreateWriteStream).toHaveBeenCalledWith('backup.zip');
    expect(mockPipe).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledTimes(4);
    expect(mockAppend).toHaveBeenCalledTimes(4);
    expect(mockFinalize).toHaveBeenCalledTimes(1);
  });

  test('uses default output path when none is provided', async () => {
    mockExecute
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    const path = await exportAllDataZip();

    expect(path).toBe('exported_data.zip');
    expect(mockCreateWriteStream).toHaveBeenCalledWith('exported_data.zip');
  });
});
