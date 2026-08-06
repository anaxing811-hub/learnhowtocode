/** Messages exchanged with the Python (Pyodide) worker. */

export type StreamKind = "stdout" | "stderr" | "status";

export interface RunnerStreamEvent {
  type: "stream";
  id: number;
  kind: StreamKind;
  text: string;
}

export interface RunnerImageEvent {
  type: "image";
  id: number;
  /** base64-encoded PNG produced by matplotlib. */
  data: string;
}

export interface RunnerDoneEvent {
  type: "done";
  id: number;
  ok: boolean;
  /** Python repr of the last expression, when there is one. */
  result?: string;
  error?: string;
  durationMs: number;
}

export interface RunnerReadyEvent {
  type: "ready";
  version: string;
}

export interface RunnerFatalEvent {
  type: "fatal";
  error: string;
}

export type WorkerOutbound =
  | RunnerStreamEvent
  | RunnerImageEvent
  | RunnerDoneEvent
  | RunnerReadyEvent
  | RunnerFatalEvent;

export interface RunRequest {
  type: "run";
  id: number;
  code: string;
  stdin?: string;
  /** Packages to make sure are loaded before the code runs. */
  packages?: string[];
}

export interface InitRequest {
  type: "init";
  indexURL: string;
  packageBaseUrl?: string;
}

export type WorkerInbound = InitRequest | RunRequest;

/** Result surfaced to the UI, common across all four languages. */
export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  images: string[];
  error?: string;
  durationMs: number;
  exitCode?: number;
}
