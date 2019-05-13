'use strict';

const { runCLI } = require('jest');
const BbPromise = require('bluebird');
const { setEnv } = require('./utils');

const runTests = (serverless, options, conf) => new BbPromise((resolve, reject) => {
  const allFunctions = serverless.service.getAllFunctions();
  const config = Object.assign({ testEnvironment: 'node' }, conf);

  const vars = new serverless.classes.Variables(serverless);
  vars.populateService(options);
  allFunctions.forEach(name => setEnv(serverless, name));

  const functionsRegex = '\\.test\\.js$';
  Object.assign(config, { testRegex: functionsRegex });

  // eslint-disable-next-line dot-notation
  process.env['SERVERLESS_TEST_ROOT'] = serverless.config.servicePath;
  process.env.NODE_ENV = 'test';

  return runCLI(config, [serverless.config.servicePath])
    .then((...success) => resolve(...success))
    .catch(e => reject(e));
});

module.exports = runTests;
