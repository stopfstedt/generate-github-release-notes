const Octokit = require('@octokit/rest');
const generateReleaseNotes = require('../lib/generateReleaseNotes');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let auth = undefined;
if (process.env.GITHUB_API_TOKEN) {
  auth = process.env.GITHUB_API_TOKEN;
}

const octokit = new Octokit({
  auth,
  userAgent: 'github release notes',
  request: {
    timeout: 5000
  }
});

const samplePath = path.join(__dirname, 'SampleNotes.md');
const sampleContent = fs.readFileSync(samplePath, 'utf-8', 'r+');

describe('Generate Real Release Notes', function () {
  this.timeout(5000); 
  it('for this repo', async function () {
    const notes = await generateReleaseNotes(
      octokit,
      'jrjohnson',
      'generate-github-release-notes',
      'v1.2.1',
      'v1.3.0'
    );
    assert.ok(notes.length > 0);
    assert.equal(notes, sampleContent);
  });
});
