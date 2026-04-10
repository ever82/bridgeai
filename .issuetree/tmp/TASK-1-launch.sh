#!/bin/bash

TASK_ID="TASK-1"
ISSUE_ID="ISSUE-A001"
WORKTREE="/Users/apple/projects/bridgeai/.issuetree/worktrees/ISSUE-A001"
PROMPT_FILE="/Users/apple/projects/bridgeai/.issuetree/tmp/${TASK_ID}-prompt.txt"
PID_FILE="/Users/apple/projects/bridgeai/.issuetree/tmp/${TASK_ID}.pid"
LOG_FILE="/Users/apple/projects/bridgeai/.issuetree/tmp/${TASK_ID}-session.log"

echo "Launching Claude Code session for ${TASK_ID}..."
echo "Worktree: ${WORKTREE}"
echo "Prompt file: ${PROMPT_FILE}"
echo ""

# Change to worktree directory
cd "$WORKTREE" || exit 1

# Launch Claude Code with the prompt
# Using claude command with the prompt file
claude -p "$(cat "$PROMPT_FILE")" 2>&1 | tee "$LOG_FILE" &

CLAUSE_PID=$!
echo $CLAUSE_PID > "$PID_FILE"

echo "Claude Code session started with PID: $CLAUSE_PID"
echo "PID file: $PID_FILE"
echo "Log file: $LOG_FILE"
