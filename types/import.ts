/**
 * @module import
 * @description Shared TypeScript interfaces for the import engine system.
 */

/**
 * @description Import job metadata for tracking detached processes.
 */
export interface ImportJob {
  /** UUID v4 */
  id: string;
  /** Child process PID */
  pid: number;
  /** Which command was invoked */
  command:
    | 'full'
    | 'check1'
    | 'check2'
    | 'check3'
    | 'check4'
    | 'check5'
    | 'check6';
  startedAt: Date;
  status: 'running' | 'completed' | 'failed';
}

/**
 * @description SSE event structure for terminal streaming.
 * When `type` is `'status'`, the `data` payload will be
 * `'completed'` | `'failed'` | `'EOF'` | a process exit message.
 */
export interface TerminalEvent {
  /** Event category: stdout line, stderr line, or lifecycle status */
  type: 'stdout' | 'stderr' | 'status';
  /**
   * Payload string.
   * - stdout/stderr: raw log line
   * - status: 'completed' | 'failed' | 'EOF' | 'Process exited with code N'
   */
  data: string;
  timestamp: number;
  jobId: string;
}

/**
 * @description API contract for import trigger.
 */
export interface ImportTriggerRequest {
  /** kitwer-tools.sh command (validated against allowlist) */
  command: string;
  /** Client-generated UUID */
  jobId: string;
}

/**
 * @description API response for import trigger.
 */
export interface ImportTriggerResponse {
  status: 'accepted';
  jobId: string;
  message: string;
}

/**
 * @description Internal result from spawning a child process.
 */
export interface SpawnResult {
  uuid: string;
  pid: number;
}
