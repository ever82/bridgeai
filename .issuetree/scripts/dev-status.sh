#!/bin/bash

# BridgeAI 开发状态快速查看
# 用法: ./dev-status.sh [watch]

PROJECT_PATH="/Users/apple/projects/bridgeai"

show_status() {
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           🔧 BridgeAI Auto Development Status                  ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    # 检查监控器是否在运行
    if pgrep -f "smart-monitor.py" > /dev/null; then
        echo "  ✅ Smart Monitor: RUNNING"
    else
        echo "  ❌ Smart Monitor: STOPPED"
        echo "     Start with: python3 $PROJECT_PATH/.issuetree/scripts/smart-monitor.py"
    fi
    echo ""

    # 活跃会话
    echo "  📱 Active Development Sessions:"
    echo "  ──────────────────────────────────────────"
    active_count=0
    for session in $(tmux ls 2>/dev/null | grep "bridgeai-" | cut -d: -f1); do
        active_count=$((active_count + 1))
        issue_id=$(echo $session | sed 's/bridgeai-//')

        # 获取最近活动
        recent=$(tmux capture-pane -t "$session" -p 2>/dev/null | tail -1 | cut -c1-50)
        echo "     • $issue_id"
        echo "       └─> $recent"
    done

    if [ $active_count -eq 0 ]; then
        echo "     (No active sessions)"
    fi
    echo ""

    # 状态文件
    if [ -f "$PROJECT_PATH/.issuetree/scripts/orchestrator-status.json" ]; then
        echo "  📊 Development Progress:"
        echo "  ──────────────────────────────────────────"

        completed=$(cat "$PROJECT_PATH/.issuetree/scripts/orchestrator-status.json" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('completed',[])))" 2>/dev/null || echo "0")
        failed=$(cat "$PROJECT_PATH/.issuetree/scripts/orchestrator-status.json" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('failed',[])))" 2>/dev/null || echo "0")
        in_progress=$(cat "$PROJECT_PATH/.issuetree/scripts/orchestrator-status.json" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('in_progress',[])))" 2>/dev/null || echo "0")

        echo "     ✅ Completed: $completed"
        echo "     ❌ Failed: $failed"
        echo "     🔄 In Progress: $in_progress"
    fi
    echo ""

    # 批次进度
    echo "  📦 Batch Progress (Strategy A):"
    echo "  ──────────────────────────────────────────"
    echo "     Batch 1: A002, F005, F006, T001     🔄 Running"
    echo "     Batch 2: A003, A004                 ⏳ Waiting for A002"
    echo "     Batch 3: C001, C002a                ⏳ Waiting for A003"
    echo "     Batch 4: C002b, C006, AI002a        ⏳ Waiting for C002a"
    echo "     Batch 5: DATE001-1/2/3              ⏳ Waiting for C006+AI002a"
    echo ""

    # 操作命令
    echo "  🎮 Commands:"
    echo "  ──────────────────────────────────────────"
    echo "     View session:    tmux attach -t bridgeai-ISSUE-xxx"
    echo "     View log:        tail -f $PROJECT_PATH/.issuetree/scripts/smart-monitor.log"
    echo "     Status detail:   cat $PROJECT_PATH/.issuetree/scripts/orchestrator-status.json"
    echo "     Stop monitor:    pkill -f smart-monitor.py"
    echo ""

    # 最后更新时间
    if [ -f "$PROJECT_PATH/.issuetree/scripts/orchestrator-status.json" ]; then
        last_update=$(cat "$PROJECT_PATH/.issuetree/scripts/orchestrator-status.json" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('last_update','N/A')[:19])" 2>/dev/null || echo "N/A")
        echo "  🕐 Last Update: $last_update"
    fi
    echo ""
    echo "  Press Ctrl+C to exit, or 'watch' mode refreshes every 5s"
}

if [ "$1" == "watch" ]; then
    while true; do
        show_status
        sleep 5
    done
else
    show_status
fi
