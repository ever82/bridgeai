#!/usr/bin/env python3
"""
BridgeAI 自动开发监控器
监控tmux会话中的claude code开发进度，自动执行check-issue和issue管理
"""

import subprocess
import time
import json
import os
import re
from datetime import datetime
from typing import List, Dict, Optional

# 配置
PROJECT_PATH = "/Users/apple/projects/bridgeai"
PLUGIN_PATH = "/Users/apple/projects/issue-tree"
ISSUES_PATH = f"{PROJECT_PATH}/.issuetree/issues"
LOG_FILE = f"{PROJECT_PATH}/.issuetree/scripts/orchestrator-monitor.log"
STATUS_FILE = f"{PROJECT_PATH}/.issuetree/scripts/orchestrator-status.json"

class IssueMonitor:
    def __init__(self):
        self.active_sessions = {}
        self.completed_issues = set()
        self.failed_issues = set()
        self.load_status()

    def log(self, message: str):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        with open(LOG_FILE, "a") as f:
            f.write(log_entry + "\n")

    def load_status(self):
        """加载状态文件"""
        if os.path.exists(STATUS_FILE):
            try:
                with open(STATUS_FILE, "r") as f:
                    data = json.load(f)
                    self.completed_issues = set(data.get("completed", []))
                    self.failed_issues = set(data.get("failed", []))
            except:
                pass

    def save_status(self):
        """保存状态文件"""
        data = {
            "completed": list(self.completed_issues),
            "failed": list(self.failed_issues),
            "active": list(self.active_sessions.keys()),
            "last_update": datetime.now().isoformat()
        }
        with open(STATUS_FILE, "w") as f:
            json.dump(data, f, indent=2)

    def get_tmux_sessions(self) -> List[str]:
        """获取所有bridgeai相关的tmux会话"""
        try:
            result = subprocess.run(
                ["tmux", "ls"],
                capture_output=True,
                text=True
            )
            sessions = []
            for line in result.stdout.split("\n"):
                if line.startswith("bridgeai-"):
                    session_name = line.split(":")[0]
                    sessions.append(session_name)
            return sessions
        except:
            return []

    def capture_pane(self, session_name: str, lines: int = 50) -> str:
        """捕获tmux pane的内容"""
        try:
            result = subprocess.run(
                ["tmux", "capture-pane", "-t", session_name, "-p"],
                capture_output=True,
                text=True
            )
            return result.stdout
        except:
            return ""

    def send_keys(self, session_name: str, keys: str):
        """发送按键到tmux会话"""
        try:
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name, keys, "C-m"],
                capture_output=True
            )
        except Exception as e:
            self.log(f"Error sending keys to {session_name}: {e}")

    def check_issue_status(self, issue_id: str) -> str:
        """检查issue状态"""
        try:
            yaml_files = subprocess.run(
                ["find", f"{ISSUES_PATH}/{issue_id}", "-name", f"{issue_id}~*.yaml"],
                capture_output=True,
                text=True
            )
            yaml_file = yaml_files.stdout.strip().split("\n")[0]
            if yaml_file:
                with open(yaml_file, "r") as f:
                    content = f.read()
                    match = re.search(r'^status:\s*"([^"]+)"', content, re.MULTILINE)
                    if match:
                        return match.group(1)
        except Exception as e:
            self.log(f"Error checking status for {issue_id}: {e}")
        return "unknown"

    def analyze_pane_content(self, session_name: str, content: str) -> Dict:
        """分析pane内容，判断开发状态"""
        issue_id = session_name.replace("bridgeai-", "")

        analysis = {
            "issue_id": issue_id,
            "session_name": session_name,
            "state": "unknown",
            "needs_input": False,
            "stuck": False,
            "completed": False,
            "error": False
        }

        # 检查是否卡住（长时间没有输出）
        if "⏵⏵ bypass permissions" in content or "❯" in content[-200:]:
            analysis["needs_input"] = True

        # 检查是否完成
        if "passed" in content.lower() and "check-issue" in content.lower():
            analysis["completed"] = True

        # 检查是否有错误
        if "error" in content.lower() or "failed" in content.lower():
            if "check-issue" not in content.lower():
                analysis["error"] = True

        # 检查是否在等待确认
        if any(x in content for x in ["(y/n)", "confirm", "continue?", "proceed?"]):
            analysis["needs_input"] = True

        return analysis

    def handle_needs_input(self, session_name: str, content: str):
        """处理需要输入的情况"""
        issue_id = session_name.replace("bridgeai-", "")

        # 如果是权限确认，自动确认
        if "bypass permissions" in content.lower():
            self.log(f"{issue_id}: Auto-confirming permission...")
            self.send_keys(session_name, "y")
            return

        # 如果是y/n确认，智能判断
        if "(y/n)" in content.lower() or "confirm" in content.lower():
            # 如果是危险操作，不自动确认
            if any(x in content.lower() for x in ["delete", "remove", "drop", "destroy"]):
                self.log(f"{issue_id}: Dangerous operation detected, skipping auto-confirm")
                return
            self.log(f"{issue_id}: Auto-confirming...")
            self.send_keys(session_name, "y")
            return

        # 如果看起来是正常开发流程中的确认
        if "proceed?" in content.lower() or "continue?" in content.lower():
            self.log(f"{issue_id}: Auto-confirming proceed...")
            self.send_keys(session_name, "y")

    def handle_completed(self, session_name: str):
        """处理开发完成的情况"""
        issue_id = session_name.replace("bridgeai-", "")
        self.log(f"{issue_id}: Development appears completed, running check-issue...")

        # 运行check-issue
        self.send_keys(session_name, f"/check-issue {issue_id}")

        # 更新状态
        self.completed_issues.add(issue_id)
        self.save_status()

    def handle_error(self, session_name: str, content: str):
        """处理错误情况"""
        issue_id = session_name.replace("bridgeai-", "")
        self.log(f"{issue_id}: Error detected, will need research...")

        # 这里可以实现自动research和拆分逻辑
        self.failed_issues.add(issue_id)
        self.save_status()

    def monitor_session(self, session_name: str):
        """监控单个会话"""
        content = self.capture_pane(session_name)
        analysis = self.analyze_pane_content(session_name, content)

        issue_id = analysis["issue_id"]

        # 检查issue状态文件
        file_status = self.check_issue_status(issue_id)

        # 如果文件状态已经是passed，标记完成
        if file_status == "passed":
            if issue_id not in self.completed_issues:
                self.log(f"{issue_id}: Status is passed, marking as completed")
                self.completed_issues.add(issue_id)
                self.save_status()
            return

        # 如果文件状态是failed，标记失败
        if file_status == "failed":
            if issue_id not in self.failed_issues:
                self.log(f"{issue_id}: Status is failed, will need research")
                self.failed_issues.add(issue_id)
                self.save_status()
            return

        # 处理各种状态
        if analysis["needs_input"]:
            self.handle_needs_input(session_name, content)
        elif analysis["completed"]:
            self.handle_completed(session_name)
        elif analysis["error"]:
            self.handle_error(session_name, content)

    def check_dependencies_satisfied(self, issue_id: str) -> bool:
        """检查issue的依赖是否都已满足"""
        try:
            yaml_files = subprocess.run(
                ["find", f"{ISSUES_PATH}/{issue_id}", "-name", f"{issue_id}~*.yaml"],
                capture_output=True,
                text=True
            )
            yaml_file = yaml_files.stdout.strip().split("\n")[0]
            if not yaml_file:
                return False

            with open(yaml_file, "r") as f:
                content = f.read()

            # 提取prerequisites
            prereq_match = re.search(r'^prerequisites:(.*?)(?=^\w|\Z)', content, re.MULTILINE | re.DOTALL)
            if not prereq_match:
                return True  # 没有依赖

            prereq_section = prereq_match.group(1)
            prereqs = re.findall(r'- "([^"]+)"', prereq_section)

            for prereq in prereqs:
                if prereq not in self.completed_issues:
                    prereq_status = self.check_issue_status(prereq)
                    if prereq_status != "passed":
                        return False

            return True
        except Exception as e:
            self.log(f"Error checking dependencies for {issue_id}: {e}")
            return False

    def start_next_batch(self):
        """启动下一批可以开发的issue"""
        # 策略A批次定义
        batch_order = [
            ["ISSUE-A002", "ISSUE-F005", "ISSUE-F006", "ISSUE-T001"],
            ["ISSUE-A003", "ISSUE-A004"],
            ["ISSUE-C001", "ISSUE-C002a"],
            ["ISSUE-C002b", "ISSUE-C006", "ISSUE-AI002a"],
            ["ISSUE-DATE001-1", "ISSUE-DATE001-2", "ISSUE-DATE001-3"],
            ["ISSUE-DATE001-4"],
        ]

        for batch in batch_order:
            for issue in batch:
                session_name = f"bridgeai-{issue}"

                # 检查是否已完成
                if issue in self.completed_issues:
                    continue

                # 检查是否已在运行
                if session_name in self.get_tmux_sessions():
                    continue

                # 检查依赖
                if self.check_dependencies_satisfied(issue):
                    self.log(f"Starting next issue: {issue}")
                    self.start_issue(issue)
                    return True

        return False

    def start_issue(self, issue_id: str):
        """启动一个新的issue开发"""
        session_name = f"bridgeai-{issue_id}"

        try:
            # 创建tmux会话
            subprocess.run(
                ["tmux", "new-session", "-d", "-s", session_name, "-c", PROJECT_PATH],
                capture_output=True,
                check=True
            )

            # 启动claude
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name,
                 f"claude --dangerously-skip-permissions --plugin-dir {PLUGIN_PATH}", "C-m"],
                capture_output=True
            )

            time.sleep(5)

            # 执行implement-issue
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name, f"/implement-issue {issue_id}", "C-m"],
                capture_output=True
            )

            self.log(f"Started {issue_id} development session")
        except Exception as e:
            self.log(f"Error starting {issue_id}: {e}")

    def run(self):
        """主运行循环"""
        self.log("=" * 60)
        self.log("BridgeAI Auto Development Orchestrator Started")
        self.log("=" * 60)

        try:
            while True:
                sessions = self.get_tmux_sessions()

                if not sessions:
                    self.log("No active sessions, trying to start next batch...")
                    if not self.start_next_batch():
                        self.log("No more issues to start, all batches complete!")
                        break
                    time.sleep(10)
                    continue

                # 监控所有活跃会话
                for session in sessions:
                    self.monitor_session(session)

                # 尝试启动下一批
                self.start_next_batch()

                # 保存状态
                self.save_status()

                # 等待下一轮检查
                time.sleep(30)

        except KeyboardInterrupt:
            self.log("Orchestrator stopped by user")
            self.save_status()

if __name__ == "__main__":
    monitor = IssueMonitor()
    monitor.run()
