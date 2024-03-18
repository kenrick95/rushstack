// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { eslintFolder } from '../_patch-base';
import {
  findAndConsoleLogPatchPathCli,
  getPathToLinterJS,
  getPathToGeneratedPatch,
  getNameOfGeneratedPatchFile
} from './path-utils';
import { patchClass, extendVerifyFunction } from './bulk-suppressions-patch';
import { generatePatchedLinterJsFileIfDoesNotExist } from './generate-patched-file';

if (!eslintFolder) {
  console.error(
    '@rushstack/eslint-patch/eslint-bulk-suppressions: Could not find ESLint installation to patch.'
  );
  process.exit(1);
}

if (process.env._RUSHSTACK_ESLINT_BULK_DETECT === 'true') {
  findAndConsoleLogPatchPathCli(__dirname);
  process.exit(0);
}

const pathToLinterJS: string = getPathToLinterJS();
const nameOfGeneratedPatchFile: string = getNameOfGeneratedPatchFile();

const pathToGeneratedPatch: string = getPathToGeneratedPatch(__dirname, nameOfGeneratedPatchFile);
generatePatchedLinterJsFileIfDoesNotExist(pathToLinterJS, pathToGeneratedPatch);
const { Linter: LinterPatch } = require(pathToGeneratedPatch);
LinterPatch.prototype.verify = extendVerifyFunction(LinterPatch.prototype.verify);

const { Linter } = require(pathToLinterJS);

patchClass(Linter, LinterPatch);
