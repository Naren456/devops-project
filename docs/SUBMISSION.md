# Capstone submission — TaskBoard

- Repository: https://github.com/Naren456/devops-project
- Images: `ghcr.io/naren456/taskboard-backend:<sha>`, `ghcr.io/naren456/taskboard-frontend:<sha>`
- Region: `ap-south-1`, EKS cluster `taskboard-eks`, namespace `taskboard`

## Rubric mapping

| Module | Where it lives |
|--------|----------------|
| M1 Application | `backend/app/` (FastAPI, 6 REST endpoints), `backend/alembic/versions/0001_create_tasks.py`, `frontend/` (React + Vite) |
| M2 Testing | `backend/tests/test_api.py` (10 tests), `backend/tests/conftest.py` (SQLite test DB), `backend/pytest.ini` |
| M3 Git | `.gitignore` covers `.env`, `__pycache__`, `node_modules`, `.venv`, `*.tfvars`, Terraform state |
| M4 Docker | `backend/Dockerfile` (UID 10001), `frontend/Dockerfile` (Node build → nginx-unprivileged UID 101), `docker-compose.yml` |
| M5 CI/CD | `.github/workflows/ci-cd.yml`: test → build → Trivy → push to GHCR with commit-SHA tags → Helm deploy to EKS |
| M6 Trivy | Scan steps in `ci-cd.yml`; write-up below |
| M7 Terraform | `terraform/` (VPC with 2 public + 2 private subnets, EKS 1.34, managed node group), `terraform.tfvars.example` |
| M8 Kubernetes + Helm | `k8s/namespace.yaml`, `helm/taskboard/` (2 replicas each, ClusterIP Services, Ingress `/` + `/api`, HPA, Postgres) |
| M9 Observability | `/metrics` on the backend, `helm/taskboard/templates/servicemonitor.yaml`, `monitoring/prometheus-values.yaml`, Grafana dashboard `helm/taskboard/dashboards/taskboard-backend.json` |
| M10 Docs | `README.md`, `STUDENT-GUIDE.md`, this file |

## M6 — Trivy write-up

Trivy scans each built image twice over: the OS packages of the base image (Debian for the backend, Alpine
for the frontend) and the language packages installed into it (Python wheels in `site-packages`). The
pipeline fails when it finds a HIGH or CRITICAL CVE that already has a fixed version upstream
(`--ignore-unfixed`), so every failure is something we can act on.

The first scan failed. The backend shipped Starlette 0.41.3 with **CVE-2025-62727**: Starlette merged
overlapping HTTP `Range` headers inefficiently, so a single crafted request to a `FileResponse` endpoint
could burn CPU and deny service. Fixed in 0.49.1; we moved to FastAPI 0.143.2 / Starlette 1.8.0 (which
also cleared CVE-2026-48818 and CVE-2026-54283). The frontend's `nginx-unprivileged:1.27-alpine` base
carried 41 HIGH/CRITICAL Alpine CVEs (OpenSSL, libxml2, musl, zlib); rebasing on `1.30-alpine` cleared
them all. Both images now scan clean.

## AWS runbook

Cost while running is roughly **US$0.30/hour (about $7/day)**: EKS control plane $0.10/h, two t3.medium
nodes, one NAT gateway and one load balancer. Destroy as soon as the screenshots are taken.

### 1. Credentials

```bash
aws configure            # IAM user with admin rights on a personal/lab account
aws sts get-caller-identity
```

### 2. Provision (M7)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out tfplan        # screenshot
terraform apply tfplan            # ~15 minutes
aws eks update-kubeconfig --region ap-south-1 --name taskboard-eks
kubectl get nodes
```

Screenshot the VPC and the EKS cluster in the AWS Console (region Mumbai / ap-south-1).

### 3. Let CI deploy (M5, M8)

The IAM identity that ran `terraform apply` is the cluster admin, so give CI the same keys:
GitHub → Settings → Secrets and variables → Actions → add `AWS_ACCESS_KEY_ID` and
`AWS_SECRET_ACCESS_KEY`. Then push any commit; the `deploy` job installs the add-ons and the chart.

Or deploy by hand:

```bash
./scripts/bootstrap-cluster.sh
SHA=$(git rev-parse HEAD)
helm upgrade --install taskboard ./helm/taskboard -n taskboard --create-namespace \
  -f helm/taskboard/values-prod.yaml --set backend.tag=$SHA --set frontend.tag=$SHA --wait
```

The GHCR packages are public, so no image pull secret is needed.

### 4. Destroy (do not skip)

The load balancer and the Postgres EBS volume are created by Kubernetes, not Terraform. Remove them first
or `terraform destroy` stalls on the VPC and leaves a billed volume behind:

```bash
helm uninstall taskboard -n taskboard
kubectl delete pvc --all -n taskboard
helm uninstall ingress-nginx -n ingress-nginx
helm uninstall kube-prometheus-stack -n monitoring
kubectl get svc -A | grep LoadBalancer      # wait until empty
cd terraform && terraform destroy            # screenshot
```

Then remove the AWS secrets from GitHub so later pushes skip the deploy job.

## Screenshot checklist (save into `docs/screenshots/`)

- [ ] M1/M4: `docker compose up --build` terminal; app at http://localhost:3000 (have: `m4-app-localhost-3000.png`)
- [ ] M2: `cd backend && pytest -v` (10 passed)
- [ ] M3: commit history (`git log --oneline`, at least 10 commits)
- [ ] M5: green Actions run; GHCR package page showing SHA tags
- [ ] M6: Trivy step output from the Actions run
- [ ] M7: `terraform plan`, AWS Console VPC + EKS, `terraform destroy` completion
- [ ] M8: `kubectl get pods -n taskboard`, `kubectl get svc -n taskboard`, `helm list -n taskboard`, app via Ingress hostname
- [ ] M9: `kubectl port-forward svc/taskboard-backend 8000 -n taskboard` then `curl localhost:8000/metrics`; Prometheus Targets page (UP); Grafana "TaskBoard Backend" dashboard
- [ ] M10: demo — edit the UI, push, watch the pipeline, show the new SHA in `kubectl get deploy -n taskboard -o wide`
