#!/usr/bin/env python3
"""Re-insert the 9 findings that failed due to invalid category."""
import sys, json
sys.path.insert(0, "/Users/z/projects/issue-tree")
from pathlib import Path
from scripts.v3.db.connection import init_db
from scripts.v3.db.models import Issue, AcceptanceCriterion, IssueAcceptanceCriterion
from scripts.v3.core.state_manager import StateManager
from scripts.v3.skills.api import SkillAPI
from sqlalchemy.orm import Session

REPORT_DIR = Path("/Users/z/projects/bridgeai/.issue/reports/_nitpick/ISSUE-INT002a/20260501_125850")

db_path = Path("/Users/z/projects/bridgeai/.issuetree/issuetree.db")
engine = init_db(db_path)
sm = StateManager(engine)

ISSUE_SLUG = "ISSUE-INT002a"
TASK_ID = 1085
TRANSITION = "accepted-to-nitpicking"

with Session(engine) as session:
    issue = session.query(Issue).filter(Issue.slug == ISSUE_SLUG).first()
    issue_id = issue.id
    iacs = session.query(IssueAcceptanceCriterion).filter(IssueAcceptanceCriterion.issue_id == issue_id).all()
    ac_map = {}
    for iac in iacs:
        ac = session.query(AcceptanceCriterion).filter(AcceptanceCriterion.id == iac.ac_id).first()
        ac_map[ac.slug] = ac.id

# Category mapping (invalid → valid)
CATEGORY_MAP = {
    "ac_verification": "verification",
    "security": "runtime_behavior",
}

# Load original findings
code_review = json.loads((REPORT_DIR / "code_review.json").read_text())
ac_verification = json.loads((REPORT_DIR / "ac_verification.json").read_text())

all_findings = []
for f in code_review.get("findings", []):
    all_findings.append({"src": "code_review", **f})
for f in ac_verification.get("findings", []):
    all_findings.append({"src": "ac_verification", **f})

# Filter only invalid-category findings
ALLOWED = {'ac_quality', 'requirement', 'code_quality', 'test_coverage', 'verification', 'consistency', 'runtime_behavior'}
to_retry = [f for f in all_findings if f["category"] not in ALLOWED]
print(f"Total to retry: {len(to_retry)}")

api = SkillAPI(sm, current_task_id=TASK_ID)
inserted = []
errors = []

for f in to_retry:
    new_category = CATEGORY_MAP.get(f["category"], f["category"])
    related_ac_id = ac_map.get(f.get("related_ac"))

    try:
        finding = api.create_nitpick_finding(
            issue_id=issue_id,
            task_id=TASK_ID,
            transition=TRANSITION,
            category=new_category,
            severity=f["severity"],
            description=f["description"],
            evidence=f.get("evidence"),
            recommendation=f.get("recommendation"),
            file_path=f.get("file_path"),
            line_range=None,
            related_ac_id=related_ac_id,
        )
        if finding is None:
            errors.append({"finding": f, "error": "returned None"})
            continue
        if getattr(finding, "status", None) == "duplicate":
            inserted.append({"slug": finding.slug, "category": new_category, "severity": finding.severity, "duplicate": True, "desc": (f["description"] or "")[:80]})
        else:
            inserted.append({"slug": finding.slug, "category": new_category, "severity": finding.severity, "desc": (f["description"] or "")[:80]})
    except Exception as e:
        errors.append({"finding": f, "error": str(e)[:200]})

print(f"Inserted: {len(inserted)}")
for x in inserted:
    print(f"  {x['slug']} [{x['severity']}/{x['category']}] {x['desc']}")
print(f"Errors: {len(errors)}")
for x in errors:
    print(f"  ERR: {x['error']} -- {x['finding'].get('description','')[:80]}")
