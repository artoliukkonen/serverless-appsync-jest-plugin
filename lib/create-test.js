'use strict';

const path = require('path');
const ejs = require('ejs');
const fse = require('fs-extra');
const BbPromise = require('bluebird');
const utils = require('./utils');

const writeFile = BbPromise.promisify(fse.writeFile);
const ensureDir = BbPromise.promisify(fse.ensureDir);

const testTemplateFile = path.join('templates', 'test-template.ejs');

const defaultTestPath = '__tests__';

const writeTestfile = (serverless, options, testConfig) => {
  const templateFile = path.join(__dirname, testTemplateFile);
  const templateString = utils.getTemplateFromFile(templateFile);
  const content = ejs.render(templateString, {
    resolverName: testConfig.resolverName,
    functionPath: path.join(
      path.relative(testConfig.testPath,
        testConfig.functionPath.dir),
      testConfig.functionPath.name,
    ),
    handlerName: testConfig.functionPath.ext.substr(1),
  });
  return ensureDir(testConfig.testPath)
    .then(() => writeFile(testConfig.testFilePath, content));
};

const testfileNotExists = testConfig => new BbPromise((resolve, reject) => {
  fse.exists(testConfig.testFilePath, (exists) => {
    if (exists) {
      return reject(`File ${testConfig.testFilePath} already exists`);
    }

    return resolve();
  });
});

const createTest = (serverless, options, config) => {
  const resolverName = options.name || config.resolverName;
  const resolverType = options.type || config.resolverType;

  const functionPath = path.parse(path.join(resolverType, `${resolverName}.js`));
  const testPath = (options.p || options.path || defaultTestPath).replace(/\{function}/, functionPath.dir);
  const testFilePath = path.join(testPath, `${resolverType}-${resolverName}.test.js`);

  const testConfig = {
    resolverName,
    functionPath,
    testPath,
    testFilePath,
  };

  return testfileNotExists(testConfig)
    .then(() => writeTestfile(serverless, options, testConfig))
    .then(() => serverless.cli.log(`Created test file ${testFilePath}`))
    .catch((error) => {
      throw new Error(error);
    });
};

module.exports = createTest;
