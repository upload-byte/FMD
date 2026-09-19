const bcrypt = require('bcryptjs');
const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = 'upload-byte';
const repo = 'FMD';
const path = 'passwords.json';

// Helper: Read and parse passwords.json from GitHub
async function getCredentialsFile() {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return { credentials: JSON.parse(content), sha: data.sha };
  } catch (err) {
    if (err.status === 404) {
      return { credentials: [], sha: null };
    }
    throw err;
  }
}

// 1. Register a new user (Check duplicate -> Hash password -> Save to GitHub)
async function registerUser(username, rawPassword) {
  try {
    const { credentials, sha } = await getCredentialsFile();

    // Check duplicate
    const exists = credentials.some(
      u => u.username.toLowerCase() === username.toLowerCase()
    );
    if (exists) {
      return { success: false, message: 'Username is already taken.' };
    }

    // Hash password & add user
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    credentials.push({
      username: username.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString()
    });

    // Commit changes back to GitHub
    const updatedContent = Buffer.from(
      JSON.stringify(credentials, null, 2)
    ).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: `Register user ${username}`,
      content: updatedContent,
      sha
    });

    return { success: true, message: 'Registration successful.' };
  } catch (err) {
    return { success: false, message: `Registration error: ${err.message}` };
  }
}

// 2. Login user (Fetch records -> Compare password hash)
async function loginUser(username, rawPassword) {
  try {
    const { credentials } = await getCredentialsFile();

    const user = credentials.find(
      u => u.username.toLowerCase() === username.toLowerCase()
    );

    // Constant message for invalid user or wrong password
    if (!user) {
      return { success: false, message: 'Invalid username or password.' };
    }

    const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!isMatch) {
      return { success: false, message: 'Invalid username or password.' };
    }

    return { success: true, message: 'Login successful!', username: user.username };
  } catch (err) {
    return { success: false, message: `Login error: ${err.message}` };
  }
}

// Example Execution
(async () => {
  // Register
  console.log(await registerUser('alex_dev', 'SuperSecret123!'));

  // Attempt Login
  console.log(await loginUser('alex_dev', 'SuperSecret123!'));
})();
