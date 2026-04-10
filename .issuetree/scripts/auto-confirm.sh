#!/bin/bash

# 自动确认所有bridgeai会话中的权限提示

for session in $(tmux ls 2>/dev/null | grep "bridgeai-" | cut -d: -f1); do
  content=$(tmux capture-pane -t "$session" -p 2>/dev/null | tail -5)

  if echo "$content" | grep -q "bypass permissions"; then
    echo "Confirming $session..."
    tmux send-keys -t "$session" "y" C-m
  fi
done

echo "Done"
