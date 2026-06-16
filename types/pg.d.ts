declare module "pg" {
  export class Pool {
    constructor(config: { connectionString: string; ssl?: false | { rejectUnauthorized: boolean } });
    query<T = any>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}
