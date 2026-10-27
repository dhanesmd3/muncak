// The subset of the Cloudflare Workers / D1 API this Worker uses. Declared here instead of
// adding @cloudflare/workers-types, and small enough to fake with node:sqlite in tests.
import type { Prompt } from '../../src/game/types';

export interface D1Meta {
  changes: number;
  last_row_id: number;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface Env {
  DB: D1Database;
  /** HMAC key for member ids (32 random bytes). Worker secret. */
  DEVICE_SECRET: string;
  /** Bearer token for /api/v1/admin/*. Unset = admin endpoints disabled. */
  ADMIN_TOKEN?: string;
}

/** Content bundled into the Worker by scripts/build-worker-content.ts. */
export interface WorkerContent {
  version: 1;
  generatedAt: string;
  launchDate: string;
  payloadKey: string;
  /** date → the day's 7 prompts, ordered, data tiers applied (yesterday … +7 days). */
  days: Record<string, Prompt[]>;
  /** Ekspedisi / Paket Tema prompts, to log those plays. */
  bank: Prompt[];
}

export interface ScheduledEventLike {
  scheduledTime: number;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}
