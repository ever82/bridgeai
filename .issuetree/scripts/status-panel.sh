#!/bin/bash

# BridgeAI 开发状态面板
# 显示所有活跃开发会话的实时状态

clear

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                  🔧 BridgeAI 自动开发编排状态面板                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# 获取活跃会话
sessions=$(tmux ls 2>/dev/null | grep "bridgeai-" | cut -d: -f1)

if [ -z "$sessions" ]; then
    echo "  ⚠️  没有活跃的开发会话"
else
    echo "  📱 活跃开发会话:"
    echo ""

    for session in $sessions; do
        issue_id=$(echo $session | sed 's/bridgeai-//')

        # 获取最后几行内容
        content=$(tmux capture-pane -t "$session" -p 2>/dev/null | tail -20)

        # 判断状态
        if echo "$content" | grep -q "passed"; then
            status="✅ PASSED"
            color="\033[32m"
        elif echo "$content" | grep -q "failed"; then
            status="❌ FAILED"
            color="\033[31m"
        elif echo "$content" | grep -q "✻\|⏺\|✶\|✳"; then
            status="🔄 WORKING"
            color="\033[33m"
        elif echo "$content" | grep -q "bypass permissions"; then
            status="⏳ WAITING"
            color="\033[36m"
        else
            status="🔄 ACTIVE"
            color="\033[33m"
        fi

        echo -e "  ${color}[$status]\033[0m $issue_id"

        # 显示最近活动
        last_activity=$(echo "$content" | grep -E "(⏺|✶|✳|Bash|Edit)" | tail -1 | cut -c1-60)
        if [ -n "$last_activity" ]; then
            echo "         └─> $last_activity..."
        fi
        echo ""
    done
fi

# 显示已完成和失败的issue
echo "  📊 已完成开发:"
if [ -f "/Users/apple/projects/bridgeai/.issuetree/scripts/orchestrator-status.json" ]; then
    completed=$(cat /Users/apple/projects/bridgeai/.issuetree/scripts/orchestrator-status.json 2>/dev/null | grep -o '"completed":\s*\[[^]]*\]' | grep -o '"[^"]*"' | tr '"' ' ')
    if [ -n "$completed" ]; then
        for issue in $completed; do
            echo "     ✅ $issue"
        done
    else
        echo "     (无)"
    fi
else
    echo "     (无数据)"
fi

echo ""
echo "  ❌ 需要处理的issue:"
if [ -f "/Users/apple/projects/bridgeai/.issuetree/scripts/orchestrator-status.json" ]; then
    failed=$(cat /Users/apple/projects/bridgeai/.issuetree/scripts/orchestrator-status.json 2>/dev/null | grep -o '"failed":\s*\[[^]]*\]' | grep -o '"[^"]*"' | tr '"' ' ')
    if [ -n "$failed" ]; then
        for issue in $failed; do
            echo "     ❌ $issue"
        done
    else
        echo "     (无)"
    fi
else
    echo "     (无数据)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║  操作命令:                                                                   ║"
echo "║  • 查看会话: tmux attach -t bridgeai-ISSUE-xxx                               ║"
echo "║  • 监控日志: tail -f ~/.issuetree/scripts/orchestrator-monitor.log          ║"
echo "║  • 查看状态: cat ~/.issuetree/scripts/orchestrator-status.json              ║"
echo "║  • 停止编排: kill $(pgrep -f orchestrator-monitor.py)                        ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
