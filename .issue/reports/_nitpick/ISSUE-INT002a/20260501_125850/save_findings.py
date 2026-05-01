#!/usr/bin/env python3
"""Save findings from Step 2 + Step 3+4 into NitpickFinding table for ISSUE-INT002a / TASK-1085."""
import sys, json
sys.path.insert(0, "/Users/z/projects/issue-tree")
from pathlib import Path
from scripts.v3.db.connection import init_db
from scripts.v3.db.models import Issue, AcceptanceCriterion, IssueAcceptanceCriterion
from scripts.v3.core.state_manager import StateManager
from scripts.v3.skills.api import SkillAPI
from sqlalchemy.orm import Session

REPORT_DIR = Path("/Users/z/projects/bridgeai/.issue/reports/_nitpick/ISSUE-INT002a/20260501_125850")

# Init DB & API
db_path = Path("/Users/z/projects/bridgeai/.issuetree/issuetree.db")
engine = init_db(db_path)
sm = StateManager(engine)

# Get issue and current task
ISSUE_SLUG = "ISSUE-INT002a"
TASK_ID = 1085
TRANSITION = "accepted-to-nitpicking"  # standard nitpick transition string

with Session(engine) as session:
    issue = session.query(Issue).filter(Issue.slug == ISSUE_SLUG).first()
    issue_id = issue.id
    # AC slug -> id map
    iacs = session.query(IssueAcceptanceCriterion).filter(IssueAcceptanceCriterion.issue_id == issue_id).all()
    ac_map = {}
    for iac in iacs:
        ac = session.query(AcceptanceCriterion).filter(AcceptanceCriterion.id == iac.ac_id).first()
        ac_map[ac.slug] = ac.id

print(f"issue_id={issue_id} task_id={TASK_ID} ac_map={ac_map}")

# Load findings
code_review = json.loads((REPORT_DIR / "code_review.json").read_text())
ac_verification = json.loads((REPORT_DIR / "ac_verification.json").read_text())

# Combine and dedupe by (description prefix, file_path)
all_findings = []
for f in code_review.get("findings", []):
    all_findings.append({"src": "code_review", **f})
for f in ac_verification.get("findings", []):
    all_findings.append({"src": "ac_verification", **f})

print(f"Total findings to insert: {len(all_findings)}")

api = SkillAPI(sm, current_task_id=TASK_ID)
inserted = []
duplicates = []
errors = []

for f in all_findings:
    related_ac_id = None
    related_ac_slug = f.get("related_ac")
    if related_ac_slug in ac_map:
        related_ac_id = ac_map[related_ac_slug]

    try:
        finding = api.create_nitpick_finding(
            issue_id=issue_id,
            task_id=TASK_ID,
            transition=TRANSITION,
            category=f["category"],
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
            duplicates.append({"slug": finding.slug, "duplicate_of": finding.duplicate_of, "desc": (f["description"] or "")[:80]})
        else:
            inserted.append({"slug": finding.slug, "category": finding.category, "severity": finding.severity, "desc": (f["description"] or "")[:80]})
    except Exception as e:
        errors.append({"finding": f, "error": str(e)})

print(f"Inserted: {len(inserted)}")
for x in inserted:
    print(f"  {x['slug']} [{x['severity']}/{x['category']}] {x['desc']}")
print(f"Duplicates: {len(duplicates)}")
for x in duplicates:
    print(f"  {x['slug']} -> {x['duplicate_of']}: {x['desc']}")
print(f"Errors: {len(errors)}")
for x in errors:
    print(f"  ERR: {x['error']} -- {x['finding'].get('description','')[:80]}")

# Save summary
summary = {
    "task_id": TASK_ID,
    "issue_id": issue_id,
    "inserted_count": len(inserted),
    "duplicates_count": len(duplicates),
    "error_count": len(errors),
    "inserted": inserted,
    "duplicates": duplicates,
    "errors": [{"error": e["error"], "description": e["finding"].get("description","")[:120]} for e in errors],
}
(REPORT_DIR / "findings_save_result.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
print(f"\nSaved to {REPORT_DIR / 'findings_save_result.json'}")
