// @ts-nocheck
// 
// Jest mock for mysql2 (covers both 'mysql2' and 'mysql2/promise')
const poolMock = {
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  end: jest.fn(),
};

const createPool = jest.fn(() => poolMock);
const createConnection = jest.fn(() => poolMock);

module.exports = {
  createPool,
  createConnection,
  Pool: jest.fn(),
};
