#!/usr/bin/env python3
"""
BridgeAI 智能开发监控器
持续监控活跃开发会话，自动检测完成并触发下一步操作
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

# 配置
PROJECT_PATH = "/Users/apple/projects/bridgeai"
PLUGIN_PATH = "/Users/apple/projects/issue-tree"
ISSUES_PATH = f"{PROJECT_PATH}/.issuetree/issues"
STATUS_FILE = f"{PROJECT_PATH}/.issuetree/scripts/orchestrator-status.json"
LOG_FILE = f"{PROJECT_PATH}/.issuetree/scripts/smart-monitor.log"
PID_FILE = f"{PROJECT_PATH}/.issuetree/scripts/smart-monitor.pid"

# 批次定义（策略A）
BATCHES = [
    {
        "name": "Batch 1: Auth Foundation",
        "issues": ["ISSUE-A002", "ISSUE-F005", "ISSUE-F006", "ISSUE-T001"]
    },
    {
        "name": "Batch 2: User Profile",
        "issues": ["ISSUE-A003", "ISSUE-A004"],
        "requires": ["ISSUE-A002"]
    },
    {
        "name": "Batch 3: Agent Core",
        "issues": ["ISSUE-C001", "ISSUE-C002a"],
        "requires": ["ISSUE-A003"]
    },
    {
        "name": "Batch 4: Scene + AI",
        "issues": ["ISSUE-C002b", "ISSUE-C006", "ISSUE-AI002a"],
        "requires": ["ISSUE-C002a"]
    },
    {
        "name": "Batch 5: Dating Profile",
        "issues": ["ISSUE-DATE001-1", "ISSUE-DATE001-2", "ISSUE-DATE001-3"],
        "requires": ["ISSUE-C006", "ISSUE-AI002a"]
    }
]

class SmartMonitor:
    def __init__(self):
        self.running = True
        self.check_interval = 30  # 每30秒检查一次
        self.load_status()
        self.setup_signal_handlers()

    def setup_signal_handlers(self):
        """设置信号处理器"""
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)

    def handle_shutdown(self, signum, frame):
        """处理关闭信号"""
        self.log(f"Received signal {signum}, shutting down...")
        self.running = False

    def log(self, message):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        print(log_entry)
        try:
            with open(LOG_FILE, "a") as f:
                f.write(log_entry + "\n")
        except:
            pass

    def load_status(self):
        """加载状态文件"""
        self.completed = set()
        self.failed = set()
        self.in_progress = set()

        if os.path.exists(STATUS_FILE):
            try:
                with open(STATUS_FILE, "r") as f:
                    data = json.load(f)
                    self.completed = set(data.get("completed", []))
                    self.failed = set(data.get("failed", []))
                    self.in_progress = set(data.get("in_progress", []))
            except:
                pass

    def save_status(self):
        """保存状态文件"""
        data = {
            "completed": sorted(list(self.completed)),
            "failed": sorted(list(self.failed)),
            "in_progress": sorted(list(self.in_progress)),
            "last_update": datetime.now().isoformat()
        }
        try:
            with open(STATUS_FILE, "w") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.log(f"Error saving status: {e}")

    def get_tmux_sessions(self):
        """获取所有bridgeai tmux会话"""
        try:
            result = subprocess.run(
                ["tmux", "ls"],
                capture_output=True,
                text=True
            )
            sessions = []
            for line in result.stdout.split("\n"):
                if line.startswith("bridgeai-"):
                    sessions.append(line.split(":")[0])
            return sessions
        except:
            return []

    def get_issue_status_from_yaml(self, issue_id):
        """从YAML文件读取issue状态"""
        try:
            issue_dir = f"{ISSUES_PATH}/{issue_id}"
            if not os.path.exists(issue_dir):
                return "unknown"

            # 查找YAML文件
            for file in os.listdir(issue_dir):
                if file.endswith('.yaml') and issue_id in file:
                    yaml_file = os.path.join(issue_dir, file)
                    with open(yaml_file, "r") as f:
                        content = f.read()
                    match = re.search(r'^status:\s*["\']([^"\']+)["\']', content, re.MULTILINE)
                    if match:
                        return match.group(1)
            return "unknown"
        except Exception as e:
            return "unknown"

    def get_session_output(self, session_name, lines=50):
        """获取tmux会话输出"""
        try:
            result = subprocess.run(
                ["tmux", "capture-pane", "-t", session_name, "-p"],
                capture_output=True,
                text=True
            )
            return result.stdout
        except:
            return ""

    def is_session_active(self, session_name):
        """检查会话是否活跃（最近有输出）"""
        content = self.get_session_output(session_name)
        # 检查是否有开发活动的迹象
        activity_indicators = ['⏺', '✶', '✳', '✻', 'thinking', 'Galloping', 'Undulating']
        for indicator in activity_indicators:
            if indicator in content:
                return True
        return False

    def detect_completion(self, session_name):
        """
        检测开发是否完成
        多种信号表明开发已完成
        """
        content = self.get_session_output(session_name)

        # 信号1：明确的成功消息
        success_signals = [
            "all criteria passed",
            "implementation complete",
            "development finished",
            "successfully implemented",
            "all tests passed"
        ]

        for signal in success_signals:
            if signal.lower() in content.lower():
                return True, signal

        # 信号2：返回命令提示符且没有活动指示器
        last_lines = content.split("\n")[-10:]
        if any(line.strip() in ['❯', '>', '$'] for line in last_lines):
            # 检查是否已经完成implement-issue
            if '/implement-issue' in content and 'implement-issue' not in last_lines[-1]:
                return True, "Command prompt returned after implementation"

        return False, None

    def send_to_session(self, session_name, command):
        """发送命令到tmux会话"""
        try:
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name, command, "C-m"],
                capture_output=True
            )
            return True
        except Exception as e:
            self.log(f"Error sending command to {session_name}: {e}")
            return False

    def check_and_update_issue(self, issue_id):
        """检查issue状态并更新"""
        session_name = f"bridgeai-{issue_id}"
        yaml_status = self.get_issue_status_from_yaml(issue_id)

        self.log(f"{issue_id}: YAML status = {yaml_status}")

        # 更新内部状态
        if yaml_status == "passed":
            if issue_id not in self.completed:
                self.completed.add(issue_id)
                self.in_progress.discard(issue_id)
                self.log(f"✅ {issue_id} moved to COMPLETED")
                return "completed"

        elif yaml_status == "failed":
            if issue_id not in self.failed:
                self.failed.add(issue_id)
                self.in_progress.discard(issue_id)
                self.log(f"❌ {issue_id} moved to FAILED")
                return "failed"

        elif yaml_status == "in_progress":
            self.in_progress.add(issue_id)

        # 如果YAML状态不是passed/failed，检测tmux会话
        if yaml_status not in ["passed", "failed"]:
            # 检查会话是否存在
            sessions = self.get_tmux_sessions()
            if session_name not in sessions:
                self.log(f"⚠️ {issue_id}: Session not found")
                return "no_session"

            # 检测开发是否完成
            is_complete, reason = self.detect_completion(session_name)

            if is_complete:
                self.log(f"🎯 {issue_id}: Detected completion ({reason})")
                # 运行check-issue
                self.log(f"Running check-issue for {issue_id}...")
                self.send_to_session(session_name, f"/check-issue {issue_id}")
                return "checking"

        return yaml_status

    def can_start_batch(self, batch):
        """检查批次是否可以开始"""
        requires = batch.get("requires", [])
        if not requires:
            return True

        for req in requires:
            if req not in self.completed:
                req_status = self.get_issue_status_from_yaml(req)
                if req_status != "passed":
                    return False
        return True

    def start_issue(self, issue_id):
        """启动一个新的issue开发"""
        session_name = f"bridgeai-{issue_id}"

        # 检查是否已在运行
        if session_name in self.get_tmux_sessions():
            self.log(f"{issue_id}: Already running")
            return True

        self.log(f"🚀 Starting development for {issue_id}...")

        try:
            # 创建tmux会话
            subprocess.run(
                ["tmux", "new-session", "-d", "-s", session_name, "-c", PROJECT_PATH],
                capture_output=True,
                check=True
            )

            # 启动claude
            time.sleep(1)
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name,
                 f"claude --dangerously-skip-permissions --plugin-dir {PLUGIN_PATH}", "C-m"],
                capture_output=True
            )

            # 等待claude启动
            time.sleep(5)

            # 执行implement-issue
            subprocess.run(
                ["tmux", "send-keys", "-t", session_name, f"/implement-issue {issue_id}", "C-m"],
                capture_output=True
            )

            self.in_progress.add(issue_id)
            self.log(f"✅ Started {issue_id}")
            return True

        except Exception as e:
            self.log(f"❌ Error starting {issue_id}: {e}")
            return False

    def start_next_batch(self):
        """启动下一批可以开发的issue"""
        for batch in BATCHES:
            if not self.can_start_batch(batch):
                continue

            for issue_id in batch["issues"]:
                # 跳过已完成或失败的
                if issue_id in self.completed or issue_id in self.failed:
                    continue

                # 跳过已在运行的
                session_name = f"bridgeai-{issue_id}"
                if session_name in self.get_tmux_sessions():
                    continue

                # 检查依赖是否满足
                yaml_status = self.get_issue_status_from_yaml(issue_id)
                if yaml_status == "passed":
                    self.completed.add(issue_id)
                    continue

                # 启动这个issue
                self.log(f"📦 Starting from batch: {batch['name']}")
                self.start_issue(issue_id)
                time.sleep(3)  # 间隔启动，避免资源冲突

    def print_summary(self):
        """打印状态摘要"""
        self.log("=" * 60)
        self.log("📊 Development Status Summary")
        self.log("=" * 60)

        # 活跃会话
        active_sessions = self.get_tmux_sessions()
        self.log(f"🔄 Active sessions: {len(active_sessions)}")
        for session in active_sessions:
            issue_id = session.replace("bridgeai-", "")
            yaml_status = self.get_issue_status_from_yaml(issue_id)
            self.log(f"   • {issue_id}: {yaml_status}")

        # 已完成
        self.log(f"✅ Completed: {len(self.completed)}")
        for issue in sorted(self.completed):
            self.log(f"   • {issue}")

        # 失败
        if self.failed:
            self.log(f"❌ Failed: {len(self.failed)}")
            for issue in sorted(self.failed):
                self.log(f"   • {issue}")

        self.log("=" * 60)

    def run(self):
        """主运行循环"""
        self.log("=" * 60)
        self.log("🚀 Smart Monitor Started")
        self.log("=" * 60)

        # 保存PID文件
        try:
            with open(PID_FILE, "w") as f:
                f.write(str(os.getpid()))
        except:
            pass

        iteration = 0

        try:
            while self.running:
                iteration += 1
                self.log(f"\n📍 Check iteration #{iteration}")

                # 1. 检查所有活跃会话
                active_sessions = self.get_tmux_sessions()
                for session in active_sessions:
                    issue_id = session.replace("bridgeai-", "")
                    self.check_and_update_issue(issue_id)

                # 2. 保存状态
                self.save_status()

                # 3. 启动下一批
                self.start_next_batch()

                # 4. 每10次迭代打印摘要
                if iteration % 10 == 0:
                    self.print_summary()

                # 等待下一次检查
                time.sleep(self.check_interval)

        except KeyboardInterrupt:
            self.log("\n👋 Monitor stopped by user")
        finally:
            # 清理PID文件
            if os.path.exists(PID_FILE):
                try:
                    os.remove(PID_FILE)
                except:
                    pass
            self.save_status()
            self.log("👋 Monitor stopped")

if __name__ == "__main__":
    monitor = SmartMonitor()
    monitor.run()
