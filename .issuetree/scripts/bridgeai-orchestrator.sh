#!/bin/bash

# BridgeAI 自动开发编排脚本
# 按照策略A：先补齐基础，再开发场景

set -e

PLUGIN_PATH="/Users/apple/projects/issue-tree"
PROJECT_PATH="/Users/apple/projects/bridgeai"
WORKTREE_BASE="$PROJECT_PATH/.issuetree/worktrees"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取issue状态
get_issue_status() {
    local issue_id=$1
    node "$PLUGIN_PATH/scripts/orchestrator.js" status 2>/dev/null | grep -E "^  - $issue_id:" | sed 's/.*: \(.*\)/\1/'
}

# 检查issue依赖是否满足
check_dependencies() {
    local issue_id=$1
    local yaml_file="$PROJECT_PATH/.issuetree/issues/$issue_id/${issue_id}~*.yaml"

    # 获取prerequisites
    local prereqs=$(grep -A 20 "^prerequisites:" $yaml_file 2>/dev/null | grep "^-" | sed 's/.*- "\(.*\)".*/\1/' | tr '\n' ' ')

    log_info "Checking dependencies for $issue_id: $prereqs"

    local all_passed=true
    for prereq in $prereqs; do
        local status=$(get_issue_status $prereq)
        if [[ "$status" != "passed" ]]; then
            log_warn "  $prereq: $status (not passed)"
            all_passed=false
        else
            log_success "  $prereq: passed"
        fi
    done

    $all_passed
}

# 启动tmux会话开发issue
develop_issue() {
    local issue_id=$1
    local session_name="bridgeai-${issue_id}"

    log_info "Starting development for $issue_id..."

    # 检查是否已有会话
    if tmux has-session -t "$session_name" 2>/dev/null; then
        log_warn "Session $session_name already exists, skipping"
        return 0
    fi

    # 创建tmux会话
    tmux new-session -d -s "$session_name" -c "$PROJECT_PATH"

    # 在会话中运行claude code
    tmux send-keys -t "$session_name" "claude --dangerously-skip-permissions --plugin-dir $PLUGIN_PATH" C-m

    # 等待claude启动
    sleep 3

    # 执行implement-issue命令
    tmux send-keys -t "$session_name" "/implement-issue $issue_id" C-m

    log_success "Started tmux session: $session_name"
    log_info "Attach with: tmux attach -t $session_name"
}

# 检查正在开发的issue状态
check_development_status() {
    local issue_id=$1
    local session_name="bridgeai-${issue_id}"

    # 检查tmux会话是否存在
    if ! tmux has-session -t "$session_name" 2>/dev/null; then
        log_error "Session $session_name not found"
        return 1
    fi

    # 检查是否卡住（可以通过日志文件或其他方式检测）
    log_info "Checking status of $issue_id development..."
}

# 策略A第一批：基础认证层
run_batch1_auth() {
    log_info "=== Batch 1: Auth Foundation ==="
    log_info "Issues: A003 (User Profile), A004 (Validation)"

    # A003依赖A002，检查A002状态
    local a002_status=$(get_issue_status "ISSUE-A002")
    log_info "A002 status: $a002_status"

    if [[ "$a002_status" == "passed" ]]; then
        develop_issue "ISSUE-A003"
        develop_issue "ISSUE-A004"
    else
        log_warn "A002 not passed, checking if we can start A002 first..."
        # A002依赖A001
        local a001_status=$(get_issue_status "ISSUE-A001")
        log_info "A001 status: $a001_status"

        if [[ "$a001_status" == "passed" || "$a001_status" == "implemented" ]]; then
            log_info "Starting A002 development..."
            develop_issue "ISSUE-A002"
        else
            log_warn "A001 not ready, need to complete A001 first"
        fi
    fi
}

# 策略A第二批：Agent核心层
run_batch2_core() {
    log_info "=== Batch 2: Agent Core ==="
    log_info "Issues: C001 (Agent Creation), C002a (L1 Model), C002b (L2 Model)"

    # 这些都需要A003完成
    develop_issue "ISSUE-C001"
    develop_issue "ISSUE-C002a"
}

# 策略A第三批：场景配置+AI提炼
run_batch3_scene_ai() {
    log_info "=== Batch 3: Scene Config + AI Extraction ==="
    log_info "Issues: C006 (Scene Config), AI002a (Demand Extraction Core)"

    develop_issue "ISSUE-C006"
    develop_issue "ISSUE-AI002a"
}

# 策略A第四批：交友场景
run_batch4_dating() {
    log_info "=== Batch 4: AgentDate Dating Scene ==="
    log_info "Issues: DATE001-1, DATE001-2, DATE001-3, DATE001-4"

    develop_issue "ISSUE-DATE001-1"
    develop_issue "ISSUE-DATE001-2"
    develop_issue "ISSUE-DATE001-3"
}

# 列出所有活跃会话
list_active_sessions() {
    log_info "=== Active Tmux Sessions ==="
    tmux ls | grep "bridgeai-" || log_warn "No active sessions"
}

# 主函数
main() {
    local command=$1

    case $command in
        "batch1")
            run_batch1_auth
            ;;
        "batch2")
            run_batch2_core
            ;;
        "batch3")
            run_batch3_scene_ai
            ;;
        "batch4")
            run_batch4_dating
            ;;
        "status")
            list_active_sessions
            ;;
        "check")
            check_development_status "$2"
            ;;
        "all")
            run_batch1_auth
            ;;
        *)
            echo "Usage: $0 {batch1|batch2|batch3|batch4|status|check <issue-id>|all}"
            echo ""
            echo "Commands:"
            echo "  batch1  - Start Batch 1: Auth Foundation (A002-A004)"
            echo "  batch2  - Start Batch 2: Agent Core (C001, C002a)"
            echo "  batch3  - Start Batch 3: Scene + AI (C006, AI002a)"
            echo "  batch4  - Start Batch 4: Dating Scene (DATE001-x)"
            echo "  status  - List active tmux sessions"
            echo "  check   - Check development status of an issue"
            echo "  all     - Start from beginning"
            exit 1
            ;;
    esac
}

main "$@"
