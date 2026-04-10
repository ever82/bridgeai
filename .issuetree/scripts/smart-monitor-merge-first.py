#!/usr/bin/env python3
"""
BridgeAI 智能开发监控器 - 合并优先版本
流程: 开发完成 → 单元测试通过 → 合并到main → 验收
"""

import subprocess
import sys
import os
import re
import json
import time
import signal
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_PATH = "/Users/apple/projects/bridgeai"
PLUGIN_PATH = "/Users/apple/projects/issue-tree"
ISSUES_PATH = f"{PROJECT_PATH}/.issuetree/issues"
STATUS_FILE = f"{PROJECT_PATH}/.issuetree/scripts/orchestrator-status.json"
LOG_FILE = f"{PROJECT_PATH}/.issuetree/scripts/smart-monitor.log"
PID_FILE = f"{PROJECT_PATH}/.issuetree/scripts/smart-monitor.pid"

class SmartMonitor:
    def __init__(self):
        self.running = True
        self.check_interval = 30
        self.load_status()
        self.setup_signal_handlers()

    def setup_signal_handlers(self):
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)

    def handle_shutdown(self, signum, frame):
        self.log(f"Received signal {signum}, shutting down...")
        self.running = False

    def log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        try:
            with open(LOG_FILE, "a") as f:
                f.write(log_entry + "\n")
        except:
            pass

    def load_status(self):
        self.completed = set()
        self.failed = set()
        self.in_progress = set()
        self.merged = set()

        if os.path.exists(STATUS_FILE):
            try:
                with open(STATUS_FILE, "r") as f:
                    data = json.load(f)
                    self.completed = set(data.get("completed", []))
                    self.failed = set(data.get("failed", []))
                    self.in_progress = set(data.get("in_progress", []))
                    self.merged = set(data.get("merged", []))
            except:
                pass

    def save_status(self):
        data = {
            "completed": sorted(list(self.completed)),
            "failed": sorted(list(self.failed)),
            "in_progress": sorted(list(self.in_progress)),
            "merged": sorted(list(self.merged)),
            "last_update": datetime.now().isoformat()
        }
        try:
            with open(STATUS_FILE, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.log(f"Error saving status: {e}")

    def get_tmux_sessions(self):
        try:
            result = subprocess.run(["tmux", "ls"], capture_output=True, text=True)
            sessions = []
            for line in result.stdout.split("\n"):
                if line.startswith("bridgeai-"):
                    sessions.append(line.split(":")[0])
            return sessions
        except:
            return []

    def get_session_output(self, session_name, lines=50):
        try:
            result = subprocess.run(
                ["tmux", "capture-pane", "-t", session_name, "-p"],
                capture_output=True, text=True
            )
            return result.stdout
        except:
            return ""

    def get_issue_status_from_yaml(self, issue_id):
        try:
            issue_dir = f"{ISSUES_PATH}/{issue_id}"
            if not os.path.exists(issue_dir):
                return "unknown"
            for file in os.listdir(issue_dir):
                if file.endswith('.yaml') and issue_id in file:
                    yaml_file = os.path.join(issue_dir, file)
                    with open(yaml_file, "r") as f:
                        content = f.read()
                    match = re.search(r'^status:\s*["\']([^"\']+)["\']', content, re.MULTILINE)
                    return match.group(1) if match else "unknown"
            return "unknown"
        except:
            return "unknown"

    def send_to_session(self, session_name, command):
        try:
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name, command, "C-m"],
                capture_output=True
            )
            return True
        except:
            return False

    def merge_issue_to_main(self, issue_id):
        """将issue合并到main分支"""
        branch_name = f"issue/{issue_id.replace('ISSUE-', 'ISSUE-')}"

        self.log(f"🔀 Merging {issue_id} to main...")

        try:
            # 切换到main分支
            result = subprocess.run(
                ["git", "checkout", "master"],
                cwd=PROJECT_PATH,
                capture_output=True,
                text=True
            )

            # 合并分支
            result = subprocess.run(
                ["git", "merge", branch_name, "--no-edit", "-m", f"Merge {issue_id}"],
                cwd=PROJECT_PATH,
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                self.log(f"✅ {issue_id} merged to main successfully")
                self.merged.add(issue_id)
                return True
            else:
                self.log(f"❌ Merge failed: {result.stderr}")
                return False
        except Exception as e:
            self.log(f"❌ Error merging {issue_id}: {e}")
            return False

    def detect_development_complete(self, session_name):
        """检测开发是否完成（单元测试通过）"""
        content = self.get_session_output(session_name)

        # 检测开发完成信号
        signals = [
            "all tests passed",
            "implementation complete",
            "development finished",
            "unit test passed",
            "✓ Test",
            "Test Suites:"
        ]

        for signal in signals:
            if signal.lower() in content.lower():
                return True, signal

        # 检测是否标记为implemented
        last_lines = content.split("\n")[-20:]
        if any("implemented" in line.lower() for line in last_lines):
            return True, "marked as implemented"

        return False, None

    def run_check_issue(self, issue_id):
        """运行check-issue进行最终验收"""
        session_name = f"bridgeai-{issue_id}"
        self.log(f"🔍 Running final check-issue for {issue_id}...")
        self.send_to_session(session_name, f"/check-issue {issue_id}")
        time.sleep(10)

    def check_and_update_issue(self, issue_id):
        """检查issue状态并按新流程处理"""
        session_name = f"bridgeai-{issue_id}"
        yaml_status = self.get_issue_status_from_yaml(issue_id)

        # 如果已经passed，标记完成
        if yaml_status == "passed":
            if issue_id not in self.completed:
                self.completed.add(issue_id)
                self.in_progress.discard(issue_id)
                self.log(f"✅ {issue_id}: PASSED")
            return "passed"

        # 如果已经failed
        if yaml_status == "failed":
            if issue_id not in self.failed:
                self.failed.add(issue_id)
                self.in_progress.discard(issue_id)
                self.log(f"❌ {issue_id}: FAILED")
            return "failed"

        # 如果已经merged，运行check-issue
        if issue_id in self.merged and yaml_status not in ["passed", "failed"]:
            self.run_check_issue(issue_id)
            return "checking"

        # 检测开发是否完成
        is_complete, reason = self.detect_development_complete(session_name)

        if is_complete:
            self.log(f"🎯 {issue_id}: Development complete ({reason})")

            # 1. 标记为implemented
            if yaml_status != "implemented":
                self.log(f"📝 Marking {issue_id} as implemented...")
                # 这里可以发送命令来更新状态

            # 2. 合并到main
            if issue_id not in self.merged:
                if self.merge_issue_to_main(issue_id):
                    # 3. 运行check-issue
                    self.run_check_issue(issue_id)
                    return "checking"
                else:
                    return "merge_failed"

        return yaml_status

    def start_issue(self, issue_id):
        """启动新的issue开发"""
        session_name = f"bridgeai-{issue_id}"

        if session_name in self.get_tmux_sessions():
            return

        self.log(f"🚀 Starting {issue_id}...")

        try:
            subprocess.run(
                ["tmux", "new-session", "-d", "-s", session_name, "-c", PROJECT_PATH],
                capture_output=True, check=True
            )
            time.sleep(1)
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name,
                 f"claude --dangerously-skip-permissions --plugin-dir {PLUGIN_PATH}", "C-m"],
                capture_output=True
            )
            time.sleep(5)
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name, f"/implement-issue {issue_id}", "C-m"],
                capture_output=True
            )
            self.in_progress.add(issue_id)
            self.log(f"✅ Started {issue_id}")
        except Exception as e:
            self.log(f"❌ Error starting {issue_id}: {e}")

    def run(self):
        self.log("=" * 60)
        self.log("🚀 Smart Monitor (Merge-First Version) Started")
        self.log("流程: 开发完成 → 合并到main → 验收")
        self.log("=" * 60)

        try:
            with open(PID_FILE, "w") as f:
                f.write(str(os.getpid()))
        except:
            pass

        iteration = 0

        try:
            while self.running:
                iteration += 1
                self.log(f"\n📍 Check #{iteration}")

                # 检查所有活跃会话
                for session in self.get_tmux_sessions():
                    issue_id = session.replace("bridgeai-", "")
                    self.check_and_update_issue(issue_id)

                self.save_status()
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            self.log("\n👋 Monitor stopped")
        finally:
            if os.path.exists(PID_FILE):
                try:
                    os.remove(PID_FILE)
                except:
                    pass
            self.save_status()

if __name__ == "__main__":
    monitor = SmartMonitor()
    monitor.run()
