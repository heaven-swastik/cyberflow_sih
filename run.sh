#!/usr/bin/env bash
# CyberFlow — one-shot setup + run for demo/judging
set -e
cd "$(dirname "$0")"

echo "== Installing root deps (concurrently) =="
npm install

echo "== Installing backend deps =="
(cd backend && npm install)

echo "== Installing frontend deps =="
(cd frontend && npm install)

echo "== Starting backend (http://localhost:5000) + frontend (http://localhost:4173) =="
echo "Open http://localhost:4173 in the browser after startup."
npm run dev
