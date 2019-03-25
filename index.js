'use strict';

const BbPromise = require('bluebird');
const lambdaWrapper = require('lambda-wrapper');

const createResolver = require('./lib/create-resolver');
const createTest = require('./lib/create-test');
// const runTests = require('./lib/run-tests');

class ServerlessJestPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.service = serverless.service || {};
    this.config = (this.service.custom && this.service.custom.jest) || {};
    this.options = options;
    this.commands = {
      create: {
        commands: {
          function: {
            usage: 'Create a AppSync resolver into the service',
            lifecycleEvents: ['create'],
            options: {
              name: {
                usage: 'Name of the resolver',
                shortcut: 'n',
                required: true,
              },
              type: {
                usage: 'Must be one "query", "mutation" or "function"',
                shortcut: 't',
                required: true,
              },
            },
          },
        },
      },
      invoke: {
        usage: 'Invoke jest tests for service / function',
        commands: {
          test: {
            usage: 'Invoke test(s)',
            lifecycleEvents: ['test'],
            options: {
              function: {
                usage: 'Name of the function',
                shortcut: 'f',
              },
              reporter: {
                usage: 'Jest reporter to use',
                shortcut: 'R',
              },
              'reporter-options': {
                usage: 'Options for jest reporter',
                shortcut: 'O',
              },
              path: {
                usage: 'Path for the tests for running tests in other than default "test" folder',
              },
            },
          },
        },
      },
    };

    this.hooks = {
      // 'invoke:test:test': () =>
      //   BbPromise.bind(this).then(() => runTests(this.serverless, this.options, this.config)),
      'create:function:create': () => BbPromise.bind(this)
        .then(() => createResolver(this.serverless, this.options))
        .then(() => createTest(this.serverless, this.options)),
    };
  }
}

module.exports = ServerlessJestPlugin;
module.exports.lambdaWrapper = lambdaWrapper;

// Match `serverless-mocha-plugin`
module.exports.getWrapper = (modName, modPath, handler) => {
  // TODO: make this fetch the data from serverless.yml

  // eslint-disable-next-line global-require, import/no-dynamic-require
  const mod = require(process.env.SERVERLESS_TEST_ROOT + modPath);

  const wrapped = lambdaWrapper.wrap(mod, {
    handler,
  });
  return wrapped;
};
