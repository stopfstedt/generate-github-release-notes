#!/usr/bin/env node
'use strict';

const meow = require('meow');
const GitHubApi = require('github');
const generateReleaseNotes = require('./lib/generateReleaseNotes');

const cli = meow(`
  Usage
    $ generate-github-release-notes <owner> <repository> <since-tag> <release-tag>

  Options
    --github-api-token, Token to use when connecting to the github API

  Examples
    $ generate-github-release-notes jrjohnson generate-github-release-notes 1.0.1 2.0.0
`,
);

if (cli.input.length < 4) {
  cli.showHelp();
}
const owner = cli.input[0];
const repository = cli.input[1];
const sinceTag = cli.input[2];
const releaseTag = cli.input[3];

const github = new GitHubApi({
  debug: false,
  protocol: 'https',
  pathPrefix: '',
  headers: {
    'user-agent': 'github release notes'
  },
  promise: Promise,
  timeout: 5000
});

if (cli.flags.githubApiToken) {
  github.authenticate({
    type: 'token',
    token: cli.flags.githubApiToken,
  });
}

generateReleaseNotes(github, owner, repository, sinceTag, releaseTag).then(releaseNotes => {
  console.log(releaseNotes);
  process.exit(0);
});
