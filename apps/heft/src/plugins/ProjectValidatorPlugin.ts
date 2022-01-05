// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { FileSystem, Path, FolderItem } from '@rushstack/node-core-library';

import { HeftConfiguration } from '../configuration/HeftConfiguration';
import { Constants } from '../utilities/Constants';
import { ScopedLogger } from '../pluginFramework/logging/ScopedLogger';
import { IHeftPlugin } from '../pluginFramework/IHeftPlugin';
import { HeftSession } from '../pluginFramework/HeftSession';
import { IHeftLifecycle } from '../pluginFramework/HeftLifecycle';
import { Hook } from 'tapable';
import { ITestStageContext } from '../stages/TestStage';
import { IBuildStageContext, IBundleSubstage } from '../stages/BuildStage';

const ALLOWED_HEFT_DATA_FOLDER_FILES: Set<string> = new Set<string>();
const ALLOWED_HEFT_DATA_FOLDER_SUBFOLDERS: Set<string> = new Set<string>([Constants.buildCacheFolderName]);

const PLUGIN_NAME: string = 'ProjectValidatorPlugin';

/**
 * This plugin is a place to do generic project-level validation. For example, ensuring that only expected
 * files are in the ".heft" folder (i.e. - legacy config files aren't still there)
 */
export class ProjectValidatorPlugin implements IHeftPlugin {
  public readonly pluginName: string = PLUGIN_NAME;

  public apply(heftSession: HeftSession, heftConfiguration: HeftConfiguration): void {
    const logger: ScopedLogger = heftSession.requestScopedLogger('project-validation');

    heftSession.hooks.heftLifecycle.tap(PLUGIN_NAME, (heftLifecycle: IHeftLifecycle) => {
      heftLifecycle.hooks.toolStart.tapPromise(PLUGIN_NAME, async () => {
        await this._scanHeftDataFolderAsync(logger, heftConfiguration);
      });
    });

    heftSession.hooks.build.tap(PLUGIN_NAME, (build: IBuildStageContext) => {
      build.hooks.bundle.tap(PLUGIN_NAME, (bundle: IBundleSubstage) => {
        bundle.hooks.run.tapPromise(PLUGIN_NAME, async () => {
          const missingPluginCandidatePackageNames: string[] = [
            '@rushstack/heft-webpack4-plugin',
            '@rushstack/heft-webpack5-plugin'
          ];
          const missingPluginDocumentationUrl: string = 'https://rushstack.io/pages/heft_tasks/webpack/';
          const missingPlugin: boolean = await this._checkPluginIsMissingAsync(
            'WebpackPlugin',
            Path.convertToSlashes(`${heftConfiguration.buildFolder}/webpack.config.js`),
            missingPluginCandidatePackageNames,
            missingPluginDocumentationUrl,
            bundle.hooks.run,
            logger
          );
          if (missingPlugin && !!bundle.properties.webpackConfiguration) {
            logger.emitWarning(
              new Error(
                'Your project appears to have a Webpack configuration generated by a plugin, ' +
                  'but the associated Heft plugin is not enabled. To fix this, you can add ' +
                  `${missingPluginCandidatePackageNames
                    .map((packageName) => `"${packageName}"`)
                    .join(' or ')} ` +
                  'to your package.json "devDependencies" and use "config/heft.json" to load it. For details, ' +
                  `see Heft's UPGRADING.md notes and this article: ${missingPluginDocumentationUrl}`
              )
            );
          }
        });
      });
    });

    heftSession.hooks.test.tap(PLUGIN_NAME, (test: ITestStageContext) => {
      test.hooks.run.tapPromise(PLUGIN_NAME, async () => {
        await this._checkPluginIsMissingAsync(
          'JestPlugin',
          Path.convertToSlashes(`${heftConfiguration.buildFolder}/config/jest.config.json`),
          ['@rushstack/heft-jest-plugin'],
          'https://rushstack.io/pages/heft_tasks/jest/',
          test.hooks.run,
          logger
        );
      });
    });

    heftSession.hooks.build.tap(PLUGIN_NAME, (build: IBuildStageContext) => {
      build.hooks.preCompile.tap(PLUGIN_NAME, async () => {
        await this._checkPluginIsMissingAsync(
          'SassTypingsPlugin',
          Path.convertToSlashes(`${heftConfiguration.buildFolder}/config/sass.json`),
          ['@rushstack/heft-sass-plugin'],
          'https://rushstack.io/pages/heft_tasks/sass-typings/',
          build.hooks.preCompile,
          logger
        );
      });
    });
  }

  private async _scanHeftDataFolderAsync(
    logger: ScopedLogger,
    heftConfiguration: HeftConfiguration
  ): Promise<void> {
    let heftDataFolderContents: FolderItem[];
    try {
      heftDataFolderContents = await FileSystem.readFolderItemsAsync(heftConfiguration.projectHeftDataFolder);
    } catch (e) {
      if (!FileSystem.isNotExistError(e as Error)) {
        throw e;
      } else {
        return;
      }
    }

    const disallowedItemNames: string[] = [];
    for (const folderItem of heftDataFolderContents) {
      const itemName: string = folderItem.name;
      if (folderItem.isDirectory()) {
        if (!ALLOWED_HEFT_DATA_FOLDER_SUBFOLDERS.has(itemName)) {
          disallowedItemNames.push(`"${itemName}/"`);
        }
      } else {
        if (!ALLOWED_HEFT_DATA_FOLDER_FILES.has(itemName)) {
          disallowedItemNames.push(`"${itemName}"`);
        }
      }
    }

    if (disallowedItemNames.length > 0) {
      logger.emitWarning(
        new Error(
          `Found unexpected items in the "${Constants.projectHeftFolderName}" ` +
            `folder: ${disallowedItemNames.join(', ')}. If any of these are config files, they ` +
            `should go in the project's "${Constants.projectConfigFolderName}" folder.`
        )
      );
    }
  }

  /**
   * A utility method to use as the tap function to the provided hook. Determines if the
   * requested plugin is installed and warns otherwise if related configuration files were
   * found. Returns false if the plugin was found, otherwise true.
   */
  private async _checkPluginIsMissingAsync(
    missingPluginName: string,
    configFilePath: string,
    missingPluginCandidatePackageNames: string[],
    missingPluginDocumentationUrl: string,
    hookToTap: Hook,
    logger: ScopedLogger
  ): Promise<boolean> {
    // If we have the plugin, we don't need to check anything else
    for (const tap of hookToTap.taps) {
      if (tap.name === missingPluginName) {
        return false;
      }
    }

    // Warn if any were found
    if (await FileSystem.existsAsync(configFilePath)) {
      logger.emitWarning(
        new Error(
          `The configuration file "${configFilePath}" exists in your project, but the associated Heft plugin ` +
            'is not enabled. To fix this, you can add ' +
            `${missingPluginCandidatePackageNames.map((packageName) => `"${packageName}"`).join(' or ')} ` +
            'to your package.json "devDependencies" and use "config/heft.json" to load it. For details, ' +
            `see Heft's UPGRADING.md notes and this article: ${missingPluginDocumentationUrl}`
        )
      );
    }

    return true;
  }
}
