"""Regenerate and validate the complete demo artifact on Windows or Unix."""

import os
import shutil
import subprocess
import sys


HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def run(script):
    subprocess.run([sys.executable, os.path.join(HERE, script)], cwd=HERE, check=True)


def main():
    run("pipeline.py")
    run("validator.py")
    run("verify_ml.py")
    run(os.path.join("db", "build_db.py"))
    shutil.copy2(os.path.join(HERE, "case_export.json"), os.path.join(ROOT, "backend", "case_export.json"))
    print("[+] Demo export copied to backend/case_export.json")


if __name__ == "__main__":
    main()