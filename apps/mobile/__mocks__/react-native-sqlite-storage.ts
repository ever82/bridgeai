const mockRows = {
  length: 0,
  item: jest.fn((_index: number) => ({ count: 0 })),
  raw: jest.fn(() => []),
};

const mockDatabase = {
  executeSql: jest.fn().mockResolvedValue([{ rows: mockRows }]),
  close: jest.fn().mockResolvedValue(undefined),
};

export const openDatabase = jest.fn().mockResolvedValue(mockDatabase);
export const DEBUG = jest.fn();
export const OPEN_READWRITE = 2;
export const OPEN_CREATE = 8;

export default {
  openDatabase,
  DEBUG,
  OPEN_READWRITE,
  OPEN_CREATE,
};
