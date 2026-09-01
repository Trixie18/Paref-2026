#!/usr/bin/env bash
# Always starts the backend from its own venv, regardless of whatever
# Python happens to be first on PATH in the current shell. app/main.py
# also refuses to start under the wrong interpreter as a second layer of
# protection — see the comment there for why that matters.
set -euo pipefail
cd "$(dirname "$0")"
source venv/bin/activate
exec uvicorn app.main:app --reload
