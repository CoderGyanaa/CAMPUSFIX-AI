#!/usr/bin/env python3
"""
CampusFix AI - Database Logical Backup & Recovery Script (M15)
Generates logical schema & data backups for Free/Demo and Production Supabase projects.
"""

import os
import sys
import subprocess
from datetime import datetime

def generate_backup():
    print("=== CampusFix AI Database Backup Tool (M15) ===")
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        print("[WARNING] DATABASE_URL environment variable is not configured.")
        print("[INFO] Operating in InMemory / Local mode. Backup skipped.")
        return

    backup_dir = os.path.join(os.path.dirname(__file__), "..", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"campusfix_backup_{timestamp}.sql")

    print(f"[INFO] Target backup file: {backup_file}")
    cmd = ["pg_dump", "--dbname=" + db_url, "--clean", "--if-exists", "--file=" + backup_file]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"[SUCCESS] Database backup created successfully: {backup_file}")
        else:
            print(f"[ERROR] pg_dump execution failed: {res.stderr}")
    except FileNotFoundError:
        print("[WARNING] pg_dump CLI is not installed locally. Ensure PostgreSQL client tools are available for logical backups.")

if __name__ == "__main__":
    generate_backup()
