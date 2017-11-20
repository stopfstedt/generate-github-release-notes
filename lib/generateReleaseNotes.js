'use strict';

const debug = require('debug')('generate-release-notes');
const Handlebars = require('handlebars');
const fs = require('mz/fs');
const appRoot = require('app-root-path');

const getTagInfo = async (Github, owner, repo, tag) => {
  debug(`Getting info for the ${tag} tag in ${owner}/${repo}`);
  try {
    const tags = await Github.repos.getTags({
      owner,
      repo,
      per_page: 100
    });

    if (tags.data.length === 0) {
      throw new Error(`${owner}:${repo} has no tags.`);
    }
    const ourTag = tags.data.find(obj => obj.name === tag);
    if (!ourTag) {
      throw new Error(`${tag} does not exist in ${owner}:${repo}`);
    }
    const name = ourTag.name;
  
    debug(`Found tag ${name} with hash ${ourTag.commit.sha}`);
  
    const tagCommit = await Github.gitdata.getCommit({
      owner,
      repo,
      sha: ourTag.commit.sha
    });
  
    const date = tagCommit.data.committer.date;
    debug(`${name} is from ${date}`);
  
    return {name, date};
  } catch (e) {
    if (e.code === 404) {
      throw new Error('This repository does not exist.');
    }

    throw new Error(e.message);
  }
  
};

const getClosedIssues = async (Github, owner, repo, since) => {
  debug(`Fetching all closed issues for ${owner}/${repo} since ${since}`);
  const result = await Github.issues.getForRepo({
    owner,
    repo,
    since,
    state: 'closed'
  });
  const issues = result.data;
  debug(`Found ${issues.length} issues`);

  const labelArrays = issues.map(obj => obj.labels);
  let labels = [];
  for (let i = 0; i < labelArrays.length; i++) {
    const arr = labelArrays[i];
    const names = arr.map(obj => obj.name);
    labels = labels.concat(names);
  }
  const minimalIssues = issues.map(({title, number, html_url, labels, user, pull_request = false}) => {
    const labelTitles = labels.map(obj => obj.name);
    let minimalUser = null;
    if (user) {
      minimalUser = {
        login: user.login,
        url: user.html_url
      };
    }
    return {title, number, url: html_url, pull_request, user: minimalUser, labels: labelTitles};
  });
  const skippedIssues = minimalIssues.filter(({labels}) => {
    return !labels.includes('greenkeeper') &&
           !labels.includes('duplicate') &&
           !labels.includes('wontfix/works for me')
    ;
  });
  const pullRequests = skippedIssues.filter(({pull_request}) => pull_request);
  const bugs = skippedIssues.filter(obj => obj.labels.includes('bug') && !pullRequests.includes(obj));
  const enhancements = skippedIssues.filter(obj => obj.labels.includes('enhancement') && !bugs.includes(obj) && !pullRequests.includes(obj));
  const remaining = skippedIssues.filter(obj => !pullRequests.includes(obj) && !bugs.includes(obj) && !enhancements.includes(obj));

  return {pullRequests, bugs, enhancements, remaining};
};

const generateReleaseNotes = async (Github, owner, repo, sinceTagName, releaseTagName) => {
  debug(`Creating ${releaseTagName} release notes for ${owner}/${repo} at ${releaseTagName}`);
  const sinceTag = await getTagInfo(Github, owner, repo, sinceTagName);
  const {pullRequests, bugs, enhancements, remaining} = await getClosedIssues(Github, owner, repo, sinceTag.date);
  const template = await fs.readFile(`${appRoot}/templates/release-notes.hbs`);
  const hbs = Handlebars.compile(template.toString());
  const repositoryUrl = `https://github.com/${owner}/${repo}`;
  const markdown = hbs({pullRequests, bugs, enhancements, remaining, releaseTagName, sinceTagName, repositoryUrl});

  return markdown;
};

module.exports = generateReleaseNotes;
