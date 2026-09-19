const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = 'upload-byte';
const repo = 'FMD';
const path = 'usernames.json';

async function addUsernameToGithub(newUsername) {
  try {
    // 1. Fetch current file content and sha hash
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    const currentContent = Buffer.from(data.content, 'base64').toString('utf8');
    const usernames = JSON.parse(currentContent);

    // 2. Duplicate check
    const isDuplicate = usernames.some(
      u => u.toLowerCase() === newUsername.toLowerCase()
    );
    if (isDuplicate) {
      console.log(`"${newUsername}" already exists.`);
      return;
    }

    // 3. Append username and re-encode to Base64
    usernames.push(newUsername);
    const updatedContent = Buffer.from(
      JSON.stringify(usernames, null, 2)
    ).toString('base64');

    // 4. Commit updated file back to the repository
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Add ${newUsername} to usernames.json`,
      content: updatedContent,
      sha: data.sha // SHA is required when updating existing files
    });

    console.log(`Successfully saved "${newUsername}" to GitHub.`);
  } catch (err) {
    console.error('Failed to update file:', err.message);
  }
}
