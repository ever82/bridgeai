/**
 * Stub for react-native-sqlite-storage (package not installed)
 */
export interface SQLiteDatabase {
  executeSql(_sql: string, _params?: any[]): Promise<any>;
  transaction(_fn: (tx: Transaction) => void): Promise<any>;
  close(): void;
}

export interface Transaction {
  executeSql(_sql: string, _params?: any[], _success?: any, _error?: any): void;
}

const SQLite = {
  enablePromise(_enable: boolean): void {
    // no-op stub
  },
  databasePath: '',
  openDatabase(_options: string | { name: string; location?: string; iosDatabaseLocation?: string }): SQLiteDatabase {
    throw new Error('react-native-sqlite-storage is not installed');
  },
  deleteDatabase(_options: any): Promise<void> {
    return Promise.resolve();
  },
  DEBUG: false,
};

export default SQLite;
