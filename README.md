# Serverless AppSync Jest Plugin

*WORK IN PROGRESS* (this plugin might not work as expected & documentation is unfinished)

A Serverless Plugin for the [Serverless Framework](http://www.serverless.com) and 
[serverless-appsync-plugin](https://github.com/sid88i/serverless-appsync-plugin) which
adds support for test-driven development using [jest](https://facebook.github.io/jest/).

## Introduction

This plugins does the following:

* It provides commands to create and run tests manually
* It provides a command to create a function, which automatically also creates a test

## Installation

In your service root, run:

```bash
npm install --save-dev serverless-appsync-plugin serverless-appsync-jest-plugin
```

Add the plugin to `serverless.yml`:

```yml
plugins:
  - serverless-appsync-plugin
  - serverless-appsync-jest-plugin
custom:
  jest:
    # You can pass jest options here
    # See details here: https://facebook.github.io/jest/docs/configuration.html
    # For instance, uncomment next line to enable code coverage
    # collectCoverage: true
  appSync:
    # AppSync plugin config
```

## Usage

### Creating resolvers / functions

Resolvers (and associated tests) can be created using the command

```
sls create appsync
```

### Running tests

Tests can be run directly using Jest or using the "invoke test" command

```
sls invoke test [--stage stage] [--region region] [-f function]
```

If no function names are passed to "invoke test", all tests related to handler functions are run.

## License
https://github.com/artoliukkonen/serverless-appsync-jest-plugin/blob/master/LICENSE
