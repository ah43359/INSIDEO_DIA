declare module "pg" {
  export interface QueryResult<Row = Record<string, unknown>> {
    rows: Row[];
    rowCount: number | null;
  }

  export class Client {
    constructor(config?: { connectionString?: string });
    connect(): Promise<void>;
    query<Row = Record<string, unknown>>(
      queryText: string,
      values?: unknown[],
    ): Promise<QueryResult<Row>>;
    end(): Promise<void>;
  }
}
