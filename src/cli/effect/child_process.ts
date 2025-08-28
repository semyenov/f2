
import { execSync } from 'child_process';
import type { ExecSyncOptions } from 'child_process';
import { Effect } from 'effect';

export const execSyncEffect = (command: string, options?: ExecSyncOptions) =>
  Effect.try(() => execSync(command, options));

