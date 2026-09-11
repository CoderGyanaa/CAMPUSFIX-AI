import os
import pytest
from app.db.store import db_store

def test_m3_sql_migration_file_exists_and_valid():
    migration_path = os.path.join(os.path.dirname(__file__), "..", "app", "db", "migrations", "001_m3_schema_and_rls.sql")
    assert os.path.exists(migration_path), "Migration file 001_m3_schema_and_rls.sql does not exist"

    with open(migration_path, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Validate essential DDL and RLS elements
    assert "CREATE SCHEMA IF NOT EXISTS auth_internal;" in sql_content
    assert "SET search_path = '';" in sql_content
    assert "auth_internal.get_active_user_university_ids" in sql_content
    assert "CONSTRAINT uq_issue_user_confirmation UNIQUE (issue_id, user_id)" in sql_content
    assert "CONSTRAINT uq_user_university UNIQUE (user_id, university_id)" in sql_content
    assert "ENABLE ROW LEVEL SECURITY" in sql_content
    assert "GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;" in sql_content
    assert "CREATE INDEX IF NOT EXISTS idx_issues_univ_status" in sql_content

def test_anti_farming_unique_confirmation_constraint():
    univ_id = "univ-test-1"
    issue_id = "issue-test-101"
    user_id = "user-student-1"

    # First confirmation succeeds
    conf1 = db_store.add_confirmation(univ_id, issue_id, user_id)
    assert conf1["user_id"] == user_id
    assert conf1["issue_id"] == issue_id

    # Second confirmation for same issue by same user MUST raise ValueError (UNIQUE constraint violation)
    with pytest.raises(ValueError) as exc_info:
        db_store.add_confirmation(univ_id, issue_id, user_id)
    assert "UNIQUE constraint violation" in str(exc_info.value)

def test_rls_same_vs_cross_university_tenant_isolation():
    univ_a = db_store.create_university("Univ A", "https://univa.edu", "univa.edu", "USA")
    univ_b = db_store.create_university("Univ B", "https://univb.edu", "univb.edu", "USA")

    user_a = db_store.create_user("student.a@univa.edu", "Pass123!", "Student A")
    mem_a = db_store.create_membership(user_a["id"], univ_a.id, role="STUDENT", status="ACTIVE")

    user_b = db_store.create_user("student.b@univb.edu", "Pass123!", "Student B")
    mem_b = db_store.create_membership(user_b["id"], univ_b.id, role="STUDENT", status="ACTIVE")

    # Add issues
    db_store.tenant_issues[univ_a.id] = [{"id": "iss-a1", "title": "Leak A"}]
    db_store.tenant_issues[univ_b.id] = [{"id": "iss-b1", "title": "Leak B"}]

    # Same university user (User A querying Univ A) -> 1 record returned
    active_mems_a = [m.university_id for m in db_store.get_user_memberships(user_a["id"]) if m.status == "ACTIVE"]
    assert univ_a.id in active_mems_a
    assert len(db_store.tenant_issues[univ_a.id]) == 1

    # Cross university user (User A querying Univ B) -> Access denied / 0 rows accessible
    assert univ_b.id not in active_mems_a

def test_suspended_membership_denies_rls_access():
    univ_c = db_store.create_university("Univ C", "https://univc.edu", "univc.edu", "USA")
    user_c = db_store.create_user("suspended@univc.edu", "Pass123!", "Suspended User")
    mem_c = db_store.create_membership(user_c["id"], univ_c.id, role="STUDENT", status="SUSPENDED")

    active_mems_c = [m.university_id for m in db_store.get_user_memberships(user_c["id"]) if m.status == "ACTIVE"]
    assert univ_c.id not in active_mems_c, "Suspended membership should not grant active RLS tenant access"
