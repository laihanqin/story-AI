declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[];
    values: any[][];
    [key: string]: any;
  }

  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): QueryExecResult[];
    run(sql: string, params?: any[]): void;
    export(): Uint8Array;
    close(): void;
  }

  interface DatabaseConstructor {
    new (data?: ArrayLike<number> | Buffer | null): Database;
  }

  interface Statement {
    bind(params?: any[]): boolean;
    step(): boolean;
    getAsObject(params?: any): QueryExecResult;
    free(): boolean;
    run(params?: any[]): void;
    get(params?: any[]): any[];
  }

  interface SqlJsStatic {
    Database: DatabaseConstructor;
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
  export type { Database, QueryExecResult };
}