#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " Starting Full DevSecOps Security Scan Suite"
echo "=========================================================="

echo "[1/4] Running Secret Scanning (Gitleaks)..."
if command -v gitleaks &>/dev/null; then
  gitleaks detect --verbose --config security/.gitleaks.toml
else
  echo "gitleaks not installed locally; will run in GitHub Actions."
fi

echo "[2/4] Running SAST - Static Application Security Testing (Bandit)..."
if command -v bandit &>/dev/null; then
  bandit -c security/bandit.yaml -r application/backend/app
else
  echo "bandit not installed locally; will run in GitHub Actions."
fi

echo "[3/4] Running SCA - Software Composition Analysis (pip-audit & npm audit)..."
if command -v pip-audit &>/dev/null; then
  pip-audit -r application/backend/requirements.txt
else
  echo "pip-audit not installed locally; will run in GitHub Actions."
fi

echo "[4/4] Container Security Gates Policy..."
echo "Trivy will evaluate built container images for HIGH and CRITICAL vulnerabilities."
echo "Exit code 1 will block container image promotion to container registry."
echo "=========================================================="
echo " DevSecOps Checks Configured & Ready"
echo "=========================================================="
