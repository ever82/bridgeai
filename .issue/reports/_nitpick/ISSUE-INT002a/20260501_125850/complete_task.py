#!/usr/bin/env python3
"""Step 6: Complete TASK-1085 (nitpick task) for ISSUE-INT002a."""
import sys
sys.path.insert(0, "/Users/z/projects/issue-tree")
from pathlib import Path
from scripts.v3.db.connection import init_db
from scripts.v3.core.state_manager import StateManager
from scripts.v3.skills.api import SkillAPI

db_path = Path("/Users/z/projects/bridgeai/.issuetree/issuetree.db")
engine = init_db(db_path)
sm = StateManager(engine)

TASK_ID = 1085
SUMMARY = "Nitpick ISSUE-INT002a: 0/2 ACs passed, 28 findings (12 critical, 11 warning, 5 info)"

api = SkillAPI(sm, current_task_id=TASK_ID)
result = api.complete_task(passed=True, summary=SUMMARY)
print(f"complete_task result: {result}")
