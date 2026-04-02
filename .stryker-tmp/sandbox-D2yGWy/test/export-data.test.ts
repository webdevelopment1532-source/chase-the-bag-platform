// @ts-nocheck
var appendMock: jest.Mock;
var pipeMock: jest.Mock;
var finalizeMock: jest.Mock;
var createWriteStreamMock: jest.Mock;

describe('export-data deep tests', () => {
  async function loadModule(dbExecute: jest.Mock) {
    jest.resetModules();

    appendMock = jest.fn();
    pipeMock = jest.fn();
    finalizeMock = jest.fn().mockResolvedValue(undefined);
    createWriteStreamMock = jest.fn(() => ({ on: jest.fn() }));

    jest.doMock('../src/db', () => ({
      getDbConnection: jest.fn().mockResolvedValue({ execute: dbExecute }),
    }));

    jest.doMock('archiver', () => {
      return jest.fn(() => ({
        append: appendMock,
        pipe: pipeMock,
        finalize: finalizeMock,
      }));
    });

    jest.doMock('fs', () => ({
      createWriteStream: createWriteStreamMock,
    }));

    const mod = await import('../src/export-data');
    return mod;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('exportAllDataZip exports all tables and returns custom output path', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([[{ code: 'A1' }], []])
      .mockResolvedValueOnce([[{ user: 'u1', score: 10 }], []])
      .mockResolvedValueOnce([[{ user: 'u1', game: 'dice' }], []])
      .mockResolvedValueOnce([[{ action: 'test' }], []]);

    const { exportAllDataZip } = await loadModule(execute);
    const outputPath = await exportAllDataZip('backup.zip');

    expect(outputPath).toBe('backup.zip');
    expect(createWriteStreamMock).toHaveBeenCalledWith('backup.zip');
    expect(pipeMock).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledTimes(4);
    expect(execute).toHaveBeenNthCalledWith(1, 'SELECT * FROM codes');
    expect(execute).toHaveBeenNthCalledWith(2, 'SELECT * FROM leaderboard');
    expect(execute).toHaveBeenNthCalledWith(3, 'SELECT * FROM game_results');
    expect(execute).toHaveBeenNthCalledWith(4, 'SELECT * FROM audit_logs');
    expect(appendMock).toHaveBeenNthCalledWith(1, JSON.stringify([{ code: 'A1' }], null, 2), { name: 'codes.json' });
    expect(appendMock).toHaveBeenNthCalledWith(2, JSON.stringify([{ user: 'u1', score: 10 }], null, 2), { name: 'leaderboard.json' });
    expect(appendMock).toHaveBeenNthCalledWith(3, JSON.stringify([{ user: 'u1', game: 'dice' }], null, 2), { name: 'game_results.json' });
    expect(appendMock).toHaveBeenNthCalledWith(4, JSON.stringify([{ action: 'test' }], null, 2), { name: 'audit_logs.json' });
    expect(finalizeMock).toHaveBeenCalledTimes(1);
  });

  test('exportAllDataZip uses default path when omitted', async () => {
    const execute = jest.fn().mockResolvedValue([[], []]);
    const { exportAllDataZip } = await loadModule(execute);

    const outputPath = await exportAllDataZip();

    expect(outputPath).toBe('exported_data.zip');
    expect(createWriteStreamMock).toHaveBeenCalledWith('exported_data.zip');
  });
});
