// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import * as path from 'path';

import { ConfigurationFileLoader, PathResolutionMethod, InheritanceType } from '../ConfigurationFileLoader';
import { FileSystem } from '@rushstack/node-core-library';

describe('ConfigLoader', () => {
  const projectRoot: string = path.resolve(__dirname, '..', '..');

  describe('A simple config file', () => {
    const configFileFolder: string = path.resolve(__dirname, 'simplestConfigFile');
    const configFilePath: string = path.resolve(configFileFolder, 'simplestConfigFile.json');
    const schemaPath: string = path.resolve(configFileFolder, 'simplestConfigFile.schema.json');

    interface ISimplestConfigFile {
      thing: string;
    }

    it('Correctly loads the config file', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimplestConfigFile> = new ConfigurationFileLoader<
        ISimplestConfigFile
      >(schemaPath);
      const loadedConfigFile: ISimplestConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimplestConfigFile = { thing: 'A' };

      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
      expect(configFileLoader.getObjectSourceFilePath(loadedConfigFile)).toEqual(configFilePath);
      expect(
        configFileLoader.getPropertyOriginalValue({ parentObject: loadedConfigFile, propertyName: 'thing' })
      ).toEqual('A');
    });

    it('Correctly resolves paths relative to the config file', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimplestConfigFile> = new ConfigurationFileLoader<
        ISimplestConfigFile
      >(schemaPath, {
        jsonPathMetadata: {
          '$.thing': {
            pathResolutionMethod: PathResolutionMethod.resolvePathRelativeToConfigurationFile
          }
        }
      });
      const loadedConfigFile: ISimplestConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimplestConfigFile = {
        thing: path.resolve(configFileFolder, 'A')
      };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
      expect(configFileLoader.getObjectSourceFilePath(loadedConfigFile)).toEqual(configFilePath);
      expect(
        configFileLoader.getPropertyOriginalValue({ parentObject: loadedConfigFile, propertyName: 'thing' })
      ).toEqual('A');
    });

    it('Correctly resolves paths relative to the project root', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimplestConfigFile> = new ConfigurationFileLoader<
        ISimplestConfigFile
      >(schemaPath, {
        jsonPathMetadata: {
          '$.thing': {
            pathResolutionMethod: PathResolutionMethod.resolvePathRelativeToProjectRoot
          }
        }
      });
      const loadedConfigFile: ISimplestConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimplestConfigFile = {
        thing: path.resolve(projectRoot, 'A')
      };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
      expect(configFileLoader.getObjectSourceFilePath(loadedConfigFile)).toEqual(configFilePath);
      expect(
        configFileLoader.getPropertyOriginalValue({ parentObject: loadedConfigFile, propertyName: 'thing' })
      ).toEqual('A');
    });
  });

  describe('A simple config file containing an array', () => {
    const configFileFolder: string = path.resolve(__dirname, 'simpleConfigFile');
    const configFilePath: string = path.resolve(configFileFolder, 'simpleConfigFile.json');
    const schemaPath: string = path.resolve(configFileFolder, 'simpleConfigFile.schema.json');

    interface ISimpleConfigFile {
      things: string[];
    }

    it('Correctly loads the config file', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath);
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimpleConfigFile = { things: ['A', 'B', 'C'] };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });

    it('Correctly resolves paths relative to the config file', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath, {
        jsonPathMetadata: {
          '$.things.*': {
            pathResolutionMethod: PathResolutionMethod.resolvePathRelativeToConfigurationFile
          }
        }
      });
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimpleConfigFile = {
        things: [
          path.resolve(configFileFolder, 'A'),
          path.resolve(configFileFolder, 'B'),
          path.resolve(configFileFolder, 'C')
        ]
      };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });

    it('Correctly resolves paths relative to the project root', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath, {
        jsonPathMetadata: {
          '$.things.*': {
            pathResolutionMethod: PathResolutionMethod.resolvePathRelativeToProjectRoot
          }
        }
      });
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimpleConfigFile = {
        things: [
          path.resolve(projectRoot, 'A'),
          path.resolve(projectRoot, 'B'),
          path.resolve(projectRoot, 'C')
        ]
      };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });
  });

  describe('A simple config file with "extends"', () => {
    const configFileFolder: string = path.resolve(__dirname, 'simpleConfigFileWithExtends');
    const configFilePath: string = path.resolve(configFileFolder, 'simpleConfigFileWithExtends.json');
    const schemaPath: string = path.resolve(configFileFolder, 'simpleConfigFileWithExtends.schema.json');

    interface ISimpleConfigFile {
      things: string[];
    }

    it('Correctly loads the config file with default config meta', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath);
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimpleConfigFile = { things: ['A', 'B', 'C', 'D', 'E'] };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });

    it('Correctly loads the config file with "append" in config meta', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath, {
        propertyInheritanceTypes: {
          things: InheritanceType.append
        }
      });
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimpleConfigFile = { things: ['A', 'B', 'C', 'D', 'E'] };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });

    it('Correctly loads the config file with "replace" in config meta', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath, {
        propertyInheritanceTypes: {
          things: InheritanceType.replace
        }
      });
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: ISimpleConfigFile = { things: ['D', 'E'] };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });

    it('Correctly resolves paths relative to the config file', async () => {
      const configFileLoader: ConfigurationFileLoader<ISimpleConfigFile> = new ConfigurationFileLoader<
        ISimpleConfigFile
      >(schemaPath, {
        jsonPathMetadata: {
          '$.things.*': {
            pathResolutionMethod: PathResolutionMethod.resolvePathRelativeToConfigurationFile
          }
        }
      });
      const loadedConfigFile: ISimpleConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const parentConfigFileFolder: string = path.resolve(configFileFolder, '..', 'simpleConfigFile');

      const expectedConfigFile: ISimpleConfigFile = {
        things: [
          path.resolve(parentConfigFileFolder, 'A'),
          path.resolve(parentConfigFileFolder, 'B'),
          path.resolve(parentConfigFileFolder, 'C'),
          path.resolve(configFileFolder, 'D'),
          path.resolve(configFileFolder, 'E')
        ]
      };
      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));
    });
  });

  describe('A complex config file', () => {
    interface IComplexConfigFile {
      plugins: { plugin: string }[];
    }

    it('Correctly loads a complex config file', async () => {
      const configFilePath: string = path.resolve(__dirname, 'complexConfigFile', 'pluginsB.json');
      const parentConfigFilePath: string = path.resolve(__dirname, 'complexConfigFile', 'pluginsA.json');
      const schemaPath: string = path.resolve(__dirname, 'complexConfigFile', 'plugins.schema.json');

      const configFileLoader: ConfigurationFileLoader<IComplexConfigFile> = new ConfigurationFileLoader<
        IComplexConfigFile
      >(schemaPath, {
        jsonPathMetadata: {
          '$.plugins.*.plugin': {
            pathResolutionMethod: PathResolutionMethod.NodeResolve
          }
        }
      });
      const loadedConfigFile: IComplexConfigFile = await configFileLoader.loadConfigurationFileAsync(
        configFilePath
      );
      const expectedConfigFile: IComplexConfigFile = {
        plugins: [
          {
            plugin: await FileSystem.getRealPathAsync(
              path.resolve(projectRoot, 'node_modules', '@rushstack', 'node-core-library')
            )
          },
          {
            plugin: await FileSystem.getRealPathAsync(
              path.resolve(projectRoot, 'node_modules', '@rushstack', 'heft')
            )
          },
          {
            plugin: await FileSystem.getRealPathAsync(
              path.resolve(projectRoot, 'node_modules', '@rushstack', 'eslint-config')
            )
          }
        ]
      };

      expect(JSON.stringify(loadedConfigFile)).toEqual(JSON.stringify(expectedConfigFile));

      expect(
        configFileLoader.getPropertyOriginalValue({
          parentObject: loadedConfigFile.plugins[0],
          propertyName: 'plugin'
        })
      ).toEqual('@rushstack/node-core-library');
      expect(
        configFileLoader.getPropertyOriginalValue({
          parentObject: loadedConfigFile.plugins[1],
          propertyName: 'plugin'
        })
      ).toEqual('@rushstack/heft');
      expect(
        configFileLoader.getPropertyOriginalValue({
          parentObject: loadedConfigFile.plugins[2],
          propertyName: 'plugin'
        })
      ).toEqual('@rushstack/eslint-config');

      expect(configFileLoader.getObjectSourceFilePath(loadedConfigFile.plugins[0])).toEqual(
        parentConfigFilePath
      );
      expect(configFileLoader.getObjectSourceFilePath(loadedConfigFile.plugins[1])).toEqual(configFilePath);
      expect(configFileLoader.getObjectSourceFilePath(loadedConfigFile.plugins[2])).toEqual(configFilePath);
    });
  });
});
