#!/bin/bash
cd /Users/apple/projects/bridgeai
claude --dangerously-skip-permissions --plugin-dir ../issue-tree "$(cat .issuetree/tmp/TASK-2-prompt.txt)"
