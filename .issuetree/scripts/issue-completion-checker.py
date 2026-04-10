#!/usr/bin/env python3
"""
BridgeAI Issue 完成检测器
检测某个issue是否开发完成，如果完成则自动运行check-issue
"""

import subprocess
import sys
import os
import re
import json
import time
from datetime import datetime

PROJECT_PATH = "/Users/apple/projects/bridgeai"
PLUGIN_PATH = "/Users/apple/projects/issue-tree"
ISSUES_PATH = f"{PROJECT_PATH}/.issuetree/issues"

def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_issue_status(issue_id):
    """从YAML文件读取issue状态"""
    try:
        result = subprocess.run(
            ["find", f"{ISSUES_PATH}/{issue_id}", "-name", f"{issue_id}~*.yaml"],
            capture_output=True,
            text=True
        )
        yaml_file = result.stdout.strip().split("\n")[0]
        if not yaml_file or not os.path.exists(yaml_file):
            return "unknown"

        with open(yaml_file, "r") as f:
            content = f.read()

        match = re.search(r'^status:\s*"([^"]+)"', content, re.MULTILINE)
        return match.group(1) if match else "unknown"
    except Exception as e:
        log(f"Error reading status: {e}")
        return "unknown"

def get_session_output(session_name, lines=100):
    """获取tmux会话的输出"""
    try:
        result = subprocess.run(
            ["tmux", "capture-pane", "-t", session_name, "-p"],
            capture_output=True,
            text=True
        )
        return result.stdout
    except:
        return ""

def is_development_complete(session_name):
    """
    判断开发是否完成
    检测信号：
    1. 输出了 "All tests passed" 或类似的成功消息
    2. 长时间没有新的工具调用（卡住）
    3. 返回了命令提示符
    4. 明确显示了"Development complete"
    """
    content = get_session_output(session_name)

    # 检测完成信号
    completion_signals = [
        "all criteria passed",
        "implementation complete",
        "development finished",
        "✅ passed",
        "all tests passed",
        "successfully implemented"
    ]

    for signal in completion_signals:
        if signal.lower() in content.lower():
            return True, f"Detected completion signal: {signal}"

    # 检测是否返回命令提示符（开发结束）
    last_lines = content.split("\n")[-20:]
    prompt_patterns = ["❯", ">", "$"]
    for line in last_lines:
        if any(line.strip().endswith(p) for p in prompt_patterns):
            # 检查是否有明显的完成标记
            if "implement-issue" not in line:
                return True, "Command prompt returned"

    return False, "Development ongoing"

def run_check_issue(issue_id):
    """运行check-issue命令"""
    session_name = f"bridgeai-{issue_id}"

    log(f"Running check-issue for {issue_id}...")

    # 发送check-issue命令
    subprocess.run(
        ["tmux", "send-keys", "-t", session_name, f"/check-issue {issue_id}", "C-m"],
        capture_output=True
    )

    # 等待一段时间让check-issue完成
    time.sleep(10)

    # 获取结果
    content = get_session_output(session_name)

    # 检测check-issue结果
    if "passed" in content.lower() and "check-issue" in content.lower():
        log(f"✅ {issue_id}: Check passed!")
        return "passed"
    elif "failed" in content.lower():
        log(f"❌ {issue_id}: Check failed!")
        return "failed"
    else:
        log(f"⏳ {issue_id}: Check result pending...")
        return "pending"

def monitor_issue(issue_id):
    """监控单个issue的开发进度"""
    session_name = f"bridgeai-{issue_id}"

    # 首先检查YAML文件状态
    yaml_status = get_issue_status(issue_id)
    log(f"{issue_id}: YAML status = {yaml_status}")

    if yaml_status == "passed":
        log(f"✅ {issue_id} already passed!")
        return "passed"

    if yaml_status == "failed":
        log(f"❌ {issue_id} already marked as failed!")
        return "failed"

    # 检查tmux会话是否存在
    result = subprocess.run(
        ["tmux", "has-session", "-t", session_name],
        capture_output=True
    )

    if result.returncode != 0:
        log(f"⚠️ {issue_id}: Tmux session not found")
        return "no_session"

    # 检查开发是否完成
    is_complete, reason = is_development_complete(session_name)

    if is_complete:
        log(f"🎯 {issue_id}: Development appears complete ({reason})")
        return run_check_issue(issue_id)

    log(f"🔄 {issue_id}: Development ongoing ({reason})")
    return "ongoing"

def update_status_file(issue_id, result):
    """更新状态文件"""
    status_file = f"{PROJECT_PATH}/.issuetree/scripts/orchestrator-status.json"

    data = {"completed": [], "failed": [], "last_update": datetime.now().isoformat()}

    if os.path.exists(status_file):
        try:
            with open(status_file, "r") as f:
                data = json.load(f)
        except:
            pass

    if result == "passed" and issue_id not in data.get("completed", []):
        data.setdefault("completed", []).append(issue_id)
        log(f"Added {issue_id} to completed list")

    if result == "failed" and issue_id not in data.get("failed", []):
        data.setdefault("failed", []).append(issue_id)
        log(f"Added {issue_id} to failed list")

    with open(status_file, "w") as f:
        json.dump(data, f, indent=2)

def main():
    if len(sys.argv) > 1:
        # 监控特定issue
        issue_id = sys.argv[1]
        result = monitor_issue(issue_id)
        update_status_file(issue_id, result)
        return

    # 监控所有活跃会话
    result = subprocess.run(
        ["tmux", "ls"],
        capture_output=True,
        text=True
    )

    sessions = []
    for line in result.stdout.split("\n"):
        if line.startswith("bridgeai-"):
            session_name = line.split(":")[0]
            issue_id = session_name.replace("bridgeai-", "")
            sessions.append(issue_id)

    log(f"Found {len(sessions)} active sessions: {sessions}")

    for issue_id in sessions:
        result = monitor_issue(issue_id)
        update_status_file(issue_id, result)
        time.sleep(2)  # 避免同时触发太多操作

if __name__ == "__main__":
    main()
