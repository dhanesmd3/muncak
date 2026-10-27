// A D1 stand-in backed by node:sqlite (D1 is SQLite), with the real migrations applied.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1Result } from '../../worker/src/env';

class Statement implements D1PreparedStatement {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private params: unknown[] = [],
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new Statement(this.db, this.sql, values);
  }

  private values(): SQLInputValue[] {
    return this.params.map((v) => (v === undefined ? null : (v as SQLInputValue)));
  }

  first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values());
    return Promise.resolve(row ? ({ ...row } as T) : null);
  }

  all<T>(): Promise<D1Result<T>> {
    const rows = this.db.prepare(this.sql).all(...this.values());
    return Promise.resolve({
      results: rows.map((r) => ({ ...r }) as T),
      success: true,
      meta: { changes: 0, last_row_id: 0 },
    });
  }

  run(): Promise<D1Result> {
    return Promise.resolve(this.runSync());
  }

  runSync(): D1Result {
    const r = this.db.prepare(this.sql).run(...this.values());
    return {
      results: [],
      success: true,
      meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) },
    };
  }
}

export class FakeD1 implements D1Database {
  readonly raw: DatabaseSync;

  constructor() {
    this.raw = new DatabaseSync(':memory:');
    this.raw.exec('PRAGMA foreign_keys = ON');
    const dir = join('worker', 'migrations');
    for (const f of readdirSync(dir)
      .filter((x) => x.endsWith('.sql'))
      .sort()) {
      this.raw.exec(readFileSync(join(dir, f), 'utf8'));
    }
  }

  prepare(sql: string): D1PreparedStatement {
    return new Statement(this.raw, sql);
  }

  /** Like D1: all statements run in one transaction. */
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    this.raw.exec('BEGIN');
    try {
      const out = statements.map((s) => (s as Statement).runSync());
      this.raw.exec('COMMIT');
      return Promise.resolve(out);
    } catch (e) {
      this.raw.exec('ROLLBACK');
      return Promise.reject(e);
    }
  }

  /** Test helper: run a query directly. */
  rows<T = Record<string, unknown>>(sql: string, ...params: SQLInputValue[]): T[] {
    return this.raw
      .prepare(sql)
      .all(...params)
      .map((r) => ({ ...r }) as T);
  }
}
