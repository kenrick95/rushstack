// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { Async, FileSystem } from '@rushstack/node-core-library';
import { type ILogMessageCallbackOptions, pnpmSyncCopyAsync } from 'pnpm-sync-lib';

import { OperationStatus } from './OperationStatus';
import type { IOperationRunnerContext } from './IOperationRunner';
import type { IPhasedCommandPlugin, PhasedCommandHooks } from '../../pluginFramework/PhasedCommandHooks';
import type { OperationExecutionRecord } from './OperationExecutionRecord';
import type { ITerminal } from '@rushstack/terminal';

const PLUGIN_NAME: 'PnpmSyncCopyOperationPlugin' = 'PnpmSyncCopyOperationPlugin';

export class PnpmSyncCopyOperationPlugin implements IPhasedCommandPlugin {
  private readonly _terminal: ITerminal;
  private readonly _isVerbose: boolean;

  public constructor(terminal: ITerminal, isVerbose: boolean) {
    this._terminal = terminal;
    this._isVerbose = isVerbose;
  }
  public apply(hooks: PhasedCommandHooks): void {
    hooks.afterExecuteOperation.tapPromise(
      PLUGIN_NAME,
      async (runnerContext: IOperationRunnerContext): Promise<void> => {
        const record: OperationExecutionRecord = runnerContext as OperationExecutionRecord;
        const {
          status,
          operation: { associatedProject: project }
        } = record;

        //skip if the phase is skipped, from cache or no operation
        if (
          status === OperationStatus.Skipped ||
          status === OperationStatus.FromCache ||
          status === OperationStatus.NoOp
        ) {
          return;
        }

        if (project) {
          const pnpmSyncJsonPath: string = `${project.projectFolder}/node_modules/.pnpm-sync.json`;
          if (await FileSystem.exists(pnpmSyncJsonPath)) {
            const { PackageExtractor } = await import(
              /* webpackChunkName: 'PackageExtractor' */
              '@rushstack/package-extractor'
            );
            await pnpmSyncCopyAsync({
              pnpmSyncJsonPath,
              ensureFolder: FileSystem.ensureFolderAsync,
              forEachAsyncWithConcurrency: Async.forEachAsync,
              getPackageIncludedFiles: PackageExtractor.getPackageIncludedFilesAsync,
              logMessageCallback: (logMessageOptions: ILogMessageCallbackOptions) => {
                const { message, messageKind } = logMessageOptions;
                switch (messageKind) {
                  case 'error':
                    this._terminal.writeErrorLine(message);
                    break;
                  case 'warning':
                    this._terminal.writeWarningLine(message);
                    break;
                  case 'verbose':
                    if (this._isVerbose) {
                      this._terminal.writeVerboseLine(message);
                    }
                    break;
                  default:
                    this._terminal.writeLine(message);
                    break;
                }
              }
            });
          }
        }
      }
    );
  }
}
