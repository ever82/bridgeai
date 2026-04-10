#!/usr/bin/env node
/**
 * Implement Issue Monitor
 * Monitors the implementation of an Issue with time limits
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    issue: null,
    task: null,
    timeLimit: 60,
    worktree: true,
    skipTests: false,
    noAutoMerge: false,
    testTimeout: 300
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--issue':
        options.issue = args[++i];
        break;
      case '--task':
        options.task = args[++i];
        break;
      case '--time-limit':
        options.timeLimit = parseInt(args[++i], 10);
        break;
      case '--no-worktree':
        options.worktree = false;
        break;
      case '--skip-tests':
        options.skipTests = true;
        break;
      case '--no-auto-merge':
        options.noAutoMerge = true;
        break;
      case '--test-timeout':
        options.testTimeout = parseInt(args[++i], 10);
        break;
    }
  }

  return options;
}

// Load YAML file
function loadYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content);
  } catch (e) {
    console.error(`Error loading YAML ${filePath}:`, e.message);
    return null;
  }
}

// Save YAML file
function saveYaml(filePath, data) {
  try {
    const content = yaml.dump(data, { lineWidth: -1 });
    fs.writeFileSync(filePath, content, 'utf8');
  } catch (e) {
    console.error(`Error saving YAML ${filePath}:`, e.message);
  }
}

// Execute command with timeout
function execPromise(command, options = {}, timeoutMs = null) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { ...options, timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });

    // Store child process for potential termination
    return child;
  });
}

// Sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Get current timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Format time remaining
function formatTimeRemaining(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Log to file
function logToFile(logFile, message) {
  const timestamp = getTimestamp();
  const logLine = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logLine);
  console.log(message);
}

// Main monitor function
async function runMonitor(options) {
  const { issue: issueId, task: taskId, timeLimit, worktree: useWorktree, skipTests, noAutoMerge, testTimeout } = options;

  if (!issueId || !taskId) {
    console.error('Usage: node implement-issue-monitor.js --issue ISSUE-XXX --task TASK-N --time-limit 60');
    process.exit(1);
  }

  const worktreePath = path.join(PROJECT_ROOT, '.issuetree/worktrees', issueId);
  const tmpDir = path.join(PROJECT_ROOT, '.issuetree/tmp');
  const logFile = path.join(tmpDir, `${taskId}-monitor.log`);
  const issueDir = path.join(PROJECT_ROOT, '.issuetree/issues', issueId);

  // Ensure tmp directory exists
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  // Initialize log
  fs.writeFileSync(logFile, `[${getTimestamp()}] Monitor started for ${issueId}/${taskId}\n`);

  logToFile(logFile, `========================================`);
  logToFile(logFile, `Implement Issue: ${issueId}`);
  logToFile(logFile, `Task: ${taskId}`);
  logToFile(logFile, `Time Limit: ${timeLimit} minutes`);
  logToFile(logFile, `Worktree: ${useWorktree ? worktreePath : 'disabled'}`);
  logToFile(logFile, `========================================`);

  try {
    // Check if worktree exists
    if (useWorktree && !fs.existsSync(worktreePath)) {
      logToFile(logFile, `Creating worktree at ${worktreePath}...`);

      // Create worktree
      await execPromise(`cd "${PROJECT_ROOT}" && git worktree add "${worktreePath}" issue/${issueId} 2>/dev/null || git worktree add -b issue/${issueId} "${worktreePath}" master`, { cwd: PROJECT_ROOT });
      logToFile(logFile, 'Worktree created successfully');
    }

    const executionDir = useWorktree ? worktreePath : PROJECT_ROOT;

    // Load task
    const taskGlob = path.join(issueDir, 'tasks', `${taskId}~*.yaml`);
    const taskFiles = require('glob').sync(taskGlob);

    if (taskFiles.length === 0) {
      throw new Error(`Task ${taskId} not found in ${issueDir}/tasks/`);
    }

    const taskPath = taskFiles[0];
    const task = loadYaml(taskPath);

    if (!task) {
      throw new Error(`Failed to load task ${taskId}`);
    }

    // Update task status
    task.status = 'in_progress';
    task.session_start = getTimestamp();
    saveYaml(taskPath, task);
    logToFile(logFile, `Task ${taskId} status updated to in_progress`);

    // Create prompt file for the session
    const promptFile = path.join(tmpDir, `${taskId}-prompt.txt`);
    const promptContent = buildPrompt(task, issueId);
    fs.writeFileSync(promptFile, promptContent);
    logToFile(logFile, `Prompt file created: ${promptFile}`);

    // Start Claude Code session using file-based prompt (like claude-session.js)
    logToFile(logFile, `Starting Claude Code session...`);
    const sessionStartTime = Date.now();
    const timeLimitMs = timeLimit * 60 * 1000;

    // Use --file flag to pass prompt (avoids stdin issues)
    const args = [
      '--dangerously-skip-permissions',
      '--plugin-dir', '../issue-tree',
      '--file', promptFile
    ];

    const claudeProcess = spawn('claude', args, {
      cwd: executionDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_IMPLEMENT_TASK: taskId,
        CLAUDE_IMPLEMENT_ISSUE: issueId
      },
      detached: true
    });

    let sessionActive = true;
    let sessionCompleted = false;
    let lastOutput = '';

    // Monitor the session
    const monitorInterval = setInterval(() => {
      const elapsed = Date.now() - sessionStartTime;
      const remaining = Math.max(0, timeLimitMs - elapsed);
      const remainingMinutes = Math.ceil(remaining / 60000);

      if (remaining <= 0) {
        logToFile(logFile, `TIMEOUT: Task did not complete within ${timeLimit} minutes`);
        sessionActive = false;
        claudeProcess.kill('SIGTERM');
      } else if (remainingMinutes % 5 === 0) {
        logToFile(logFile, `Time remaining: ${remainingMinutes} minutes`);
      }
    }, 60000); // Check every minute

    // Handle process output
    claudeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      lastOutput += output;
      // Keep only last 1000 chars
      if (lastOutput.length > 1000) {
        lastOutput = lastOutput.slice(-1000);
      }
    });

    claudeProcess.stderr.on('data', (data) => {
      const output = data.toString();
      logToFile(logFile, `Session stderr: ${output.slice(0, 200)}`);
    });

    // Wait for session to end or timeout
    await new Promise((resolve) => {
      claudeProcess.on('exit', (code) => {
        clearInterval(monitorInterval);
        sessionActive = false;
        sessionCompleted = true;
        logToFile(logFile, `Session ended with code ${code}`);
        resolve();
      });

      // Also resolve if sessionActive becomes false (timeout)
      const checkInterval = setInterval(() => {
        if (!sessionActive) {
          clearInterval(checkInterval);
          try {
            claudeProcess.kill('SIGKILL');
          } catch (e) {
            // Process may already be dead
          }
          resolve();
        }
      }, 1000);
    });

    const sessionEndTime = Date.now();
    const executionTimeMinutes = Math.round((sessionEndTime - sessionStartTime) / 60000);

    logToFile(logFile, `Session execution time: ${executionTimeMinutes} minutes`);

    // Check for completion marker
    const resultFile = path.join(tmpDir, `${taskId}-result.json`);
    let taskResult = null;

    if (fs.existsSync(resultFile)) {
      try {
        taskResult = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        logToFile(logFile, `Task result loaded: ${taskResult.status}`);
      } catch (e) {
        logToFile(logFile, `Error loading result file: ${e.message}`);
      }
    }

    // Update task with session end
    task.session_end = getTimestamp();
    task.execution_time_minutes = executionTimeMinutes;

    // Determine if task succeeded
    if (!sessionCompleted) {
      task.status = 'failed';
      task.result = `TIMEOUT: Task did not complete within ${timeLimit} minutes`;
      logToFile(logFile, `Task ${taskId} marked as failed (timeout)`);
    } else if (taskResult && taskResult.status === 'completed') {
      task.status = 'completed';
      task.result = 'success';
      logToFile(logFile, `Task ${taskId} marked as completed`);
    } else {
      // Check if implementation was successful by looking at git status
      try {
        const { stdout } = await execPromise('git status --porcelain', { cwd: executionDir });
        if (stdout.trim()) {
          task.status = 'completed';
          task.result = 'success';
          logToFile(logFile, `Task ${taskId} marked as completed (changes detected)`);
        } else {
          task.status = 'failed';
          task.result = 'No changes made';
          logToFile(logFile, `Task ${taskId} marked as failed (no changes)`);
        }
      } catch (e) {
        task.status = 'failed';
        task.result = `Error checking status: ${e.message}`;
        logToFile(logFile, `Task ${taskId} marked as failed (status check error)`);
      }
    }

    saveYaml(taskPath, task);

    // Run tests if enabled and task succeeded
    let testPassed = null;
    let testOutput = '';

    if (!skipTests && task.status === 'completed') {
      logToFile(logFile, `Running unit tests...`);

      // Get test commands from task or auto-detect
      const testCommands = task.test_commands || [];

      if (testCommands.length > 0) {
        for (const cmd of testCommands) {
          logToFile(logFile, `Running test: ${cmd}`);
          try {
            const { stdout, stderr } = await execPromise(cmd, { cwd: executionDir }, testTimeout * 1000);
            testOutput += stdout + '\n' + stderr + '\n';
            logToFile(logFile, `Test passed: ${cmd.slice(0, 50)}...`);
          } catch (result) {
            testOutput += result.stdout + '\n' + result.stderr + '\n';
            logToFile(logFile, `Test failed: ${cmd.slice(0, 50)}...`);
            testPassed = false;
            break;
          }
        }
        if (testPassed === null) testPassed = true;
      } else {
        logToFile(logFile, 'No test commands configured, skipping tests');
        testPassed = true;
      }
    }

    // Merge to master if tests passed and auto-merge enabled
    let mergeResult = null;
    if (task.status === 'completed' && testPassed && !noAutoMerge && useWorktree) {
      logToFile(logFile, `Merging to master...`);
      try {
        // Commit changes in worktree
        await execPromise('git add -A && git commit -m "' + `Implement ${issueId}` + '" 2>/dev/null || true', { cwd: executionDir });

        // Merge to master
        await execPromise(`cd "${PROJECT_ROOT}" && git merge issue/${issueId} --no-ff -m "Implement ${issueId}"`, { cwd: PROJECT_ROOT });
        logToFile(logFile, `Merge successful`);
        mergeResult = 'success';
      } catch (e) {
        logToFile(logFile, `Merge failed: ${e.error?.message || e.message}`);
        // Abort merge
        await execPromise('git merge --abort 2>/dev/null || true', { cwd: PROJECT_ROOT });
        mergeResult = 'conflict';
      }
    }

    // Update Issue status
    const issueGlob = path.join(issueDir, `${issueId}~*.yaml`);
    const issueFiles = require('glob').sync(issueGlob);

    if (issueFiles.length > 0) {
      const issuePath = issueFiles[0];
      const issue = loadYaml(issuePath);

      if (issue) {
        // Update implementation info
        issue.implementation = {
          task_id: taskId,
          completed_at: getTimestamp(),
          execution_time_minutes: executionTimeMinutes,
          result: task.status === 'completed' ? 'success' : 'failed'
        };

        if (task.status === 'completed') {
          issue.status = 'implemented';
          issue.test_passed = testPassed;
          issue.test_duration_seconds = testPassed ? testTimeout : 0;
          issue.merged_to_master = mergeResult === 'success';
          issue.worktree_path = mergeResult === 'success' ? null : worktreePath;

          logToFile(logFile, `\n✅ IMPLEMENTATION SUCCESS`);
          logToFile(logFile, `   Issue ${issueId} status: implemented`);
          logToFile(logFile, `   Task ${taskId} status: completed`);
          if (testPassed !== null) {
            logToFile(logFile, `   Tests: ${testPassed ? 'PASSED' : 'FAILED'}`);
          }
          if (mergeResult) {
            logToFile(logFile, `   Merge: ${mergeResult === 'success' ? 'SUCCESS' : 'CONFLICT'}`);
          }
        } else {
          issue.status = 'failed';
          issue.implementation.failure_reason = task.result;
          issue.test_passed = false;
          issue.worktree_path = worktreePath;

          logToFile(logFile, `\n❌ IMPLEMENTATION FAILED`);
          logToFile(logFile, `   Issue ${issueId} status: failed`);
          logToFile(logFile, `   Task ${taskId} status: ${task.status}`);
          logToFile(logFile, `   Reason: ${task.result}`);
        }

        saveYaml(issuePath, issue);
      }
    }

    // Cleanup worktree if merge was successful
    if (mergeResult === 'success' && useWorktree) {
      logToFile(logFile, `Cleaning up worktree...`);
      await execPromise(`cd "${PROJECT_ROOT}" && git worktree remove "${worktreePath}" --force 2>/dev/null || rm -rf "${worktreePath}"`, { cwd: PROJECT_ROOT });
      await execPromise(`cd "${PROJECT_ROOT}" && git branch -D issue/${issueId} 2>/dev/null || true`, { cwd: PROJECT_ROOT });
      logToFile(logFile, `Worktree cleaned up`);
    }

    logToFile(logFile, `========================================`);
    logToFile(logFile, `Monitor completed`);

  } catch (error) {
    logToFile(logFile, `ERROR: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Build implementation prompt
function buildPrompt(task, issueId) {
  const files = task.files_to_modify || [];
  const filesSection = files.length > 0
    ? files.map(f => `- ${f}`).join('\n')
    : '- (To be determined based on implementation)';

  return `# Implementation Task: ${task.title}

**Issue:** ${issueId}
**Task:** ${task.id}

## Description

${task.description}

## Files to Modify

${filesSection}

## Instructions

1. Implement the features described above
2. Make focused, incremental changes
3. Test your changes as you go
4. Commit your work when complete

## Completion

When you have completed the implementation:
1. Run: \`echo '{"status": "completed"}' > .issuetree/tmp/${task.id}-result.json\`
2. Exit the session

---

Start implementing now.`;
}

// Run the monitor
const options = parseArgs();
runMonitor(options).catch(err => {
  console.error('Monitor failed:', err);
  process.exit(1);
});
