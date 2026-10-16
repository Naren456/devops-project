# StockDesk — End-to-End Cloud-Native DevOps Capstone

![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=github-actions)
![Kubernetes](https://img.shields.io/badge/Kubernetes-EKS%20v1.34-326ce5?logo=kubernetes)
![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC?logo=terraform)
![DevSecOps](https://img.shields.io/badge/DevSecOps-Trivy%20%7C%20Gitleaks%20%7C%20Bandit-critical?logo=security)
![Observability](https://img.shields.io/badge/Monitoring-Prometheus%20%26%20Grafana-orange?logo=prometheus)
![GitOps](https://img.shields.io/badge/GitOps-ArgoCD-green?logo=argo)


**StockDesk** is a hardware inventory / stock-tracking application used as the vehicle for a full, production-grade DevOps lifecycle: containers, CI/CD, DevSecOps scanning, infrastructure as code, Kubernetes, Helm, GitOps, and observability.

### Demo video

[![Watch the demo on Loom](https://img.shields.io/badge/Demo-Watch%20on%20Loom-625DF5?logo=loom&logoColor=white)](https://www.loom.com/share/17e254cf0a774a64ac4bbb830a0a734e)

Recorded walkthrough of the full flow (commit → CI/CD pipeline → deployment update): **[https://www.loom.com/share/17e254cf0a774a64ac4bbb830a0a734e](https://www.loom.com/share/17e254cf0a774a64ac4bbb830a0a734e)**

Presentation deck: _add `StockDesk_DevOps_Capstone.pptx` here for M10._

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Technologies Used](#3-technologies-used)
4. [Application Setup](#4-application-setup)
5. [Docker Setup](#5-docker-setup)
6. [Kubernetes Deployment](#6-kubernetes-deployment)
7. [Helm Deployment](#7-helm-deployment)
8. [Terraform Infrastructure](#8-terraform-infrastructure)
9. [CI/CD Pipeline](#9-cicd-pipeline)
10. [DevSecOps Implementation](#10-devsecops-implementation)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [GitOps Workflow](#12-gitops-workflow)
13. [Troubleshooting Lab](#13-troubleshooting-lab)
14. [Lessons Learned](#14-lessons-learned)

---

## 1. Project Overview

> **Live proof:** StockDesk running locally via `docker compose` — dashboard with Total items / In stock / Low stock / Out of stock cards.

![StockDesk dashboard locally (M1/M4)](screenshot/m1-app-localhost-3000.png)

> **Live proof:** Same app served through the EKS ingress-nginx load balancer.

![StockDesk via Ingress on EKS (M8)](screenshot/m8-app-via-ingress.png)

This capstone delivers an automated, secure, cloud-native delivery and operations lifecycle for **StockDesk** — a hardware store inventory tracker where each product has a name, SKU, category, quantity and price, and its stock status (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`) is derived automatically from the quantity on hand.

- **Application Layer:** React 18 + Vite single-page frontend, FastAPI (Python 3.12) backend, PostgreSQL 16 with Alembic schema migrations.
- **Continuous Integration & DevSecOps:** Pytest unit tests, secret scanning (Gitleaks), SAST (Bandit), dependency audit (pip-audit / npm audit), container CVE scanning (Trivy), and a security gate that blocks HIGH/CRITICAL findings.
- **Continuous Delivery & GitOps:** Immutable image tagging by Git commit SHA, publication to GitHub Container Registry (GHCR), and declarative reconciliation with ArgoCD.
- **Infrastructure as Code:** Modular Terraform provisioning a VPC (public/private subnets, NAT), and an Amazon EKS managed cluster.
- **Platform Engineering:** Declarative Kubernetes objects (Deployments, Services, ConfigMap, Secret, Ingress, PVC, HPA) plus a Helm chart.
- **Observability:** Prometheus `/metrics` instrumentation, a ServiceMonitor, a Grafana dashboard, and alerting rules.
- **Incident Management:** A troubleshooting suite of deliberately broken manifests for root-cause practice.

---

## 2. Architecture Diagram

### End-to-End DevOps Lifecycle Flow
```text
Developer Git Push
       │
       ▼
GitHub Repository (Single Source of Truth)
       │
       ▼
GitHub Actions CI Pipeline
       ├── 1. Unit Tests (Pytest) & UI Build (Vite)
       ├── 2. Secret Scan (Gitleaks)
       ├── 3. SAST Code Scan (Bandit)
       ├── 4. SCA Dependency Scan (pip-audit & npm audit)
       ├── 5. Multi-stage Docker Container Build
       ├── 6. Container Image CVE Scan (Trivy)
       │       │
       │       ▼ (Gate: stop on HIGH/CRITICAL CVEs)
       └── 7. Push SHA-tagged images to GHCR
                   │
                   ▼
       +───────────────────────────────────+
       │   GitOps Engine (ArgoCD)          │
       │   Reconciles helm/stockdesk       │
       +─────────────────┬─────────────────+
                         │ Reconciles
                         ▼
       +───────────────────────────────────+
       │      AWS Cloud (ap-south-1)       │
       │   Terraform-provisioned VPC       │
       │   AWS EKS Kubernetes Cluster      │
       │                                   │
       │  [Ingress-NGINX Controller / ELB] │
       │        │                 │        │
       │        ▼                 ▼        │
       │  Frontend Pods     Backend Pods   │
       │   (Nginx/React)     (FastAPI)     │
       │                           │       │
       │                     PostgreSQL    │
       │                      (Stateful)   │
       │                           │       │
       │       [Prometheus + Grafana]      │
       +───────────────────────────────────+
```

### Kubernetes Cluster Architecture
```mermaid
flowchart TD
    Browser["User Web Browser"]

    subgraph K8s ["Kubernetes Cluster (Namespace: stockdesk)"]
        Ingress["Ingress-NGINX Controller<br/>AWS ELB"]

        subgraph FrontendTier ["Frontend Tier"]
            F_SVC["stockdesk-frontend (ClusterIP: 80)"]
            F_DEP["frontend Deployment (2 replicas)<br/>Nginx + React build"]
        end
        subgraph BackendTier ["Backend Tier"]
            B_SVC["stockdesk-backend (ClusterIP: 8000)"]
            B_DEP["backend Deployment (2 replicas)<br/>FastAPI / Python 3.12"]
            HPA["HorizontalPodAutoscaler<br/>60% CPU (2–6 pods)"]
        end
        subgraph StorageTier ["Data Tier"]
            DB_SVC["stockdesk-postgres (ClusterIP: 5432)"]
            DB_DEP["postgres Deployment (1 replica)<br/>PostgreSQL 16"]
            PVC["PersistentVolumeClaim (5Gi gp3)"]
        end
        subgraph MonitoringTier ["Observability"]
            SM["ServiceMonitor (/metrics)"]
            PROM["Prometheus"]
            GRAF["Grafana"]
        end
    end

    Browser -->|/| Ingress
    Ingress -->|/api| B_SVC
    Ingress -->|/| F_SVC
    F_SVC --> F_DEP
    B_SVC --> B_DEP
    B_DEP --> DB_SVC
    DB_SVC --> DB_DEP
    DB_DEP --> PVC
    HPA -. Scales .-> B_DEP
    SM -. Scrapes .-> B_DEP
    PROM --> SM
    GRAF --> PROM
```

---

## 3. Technologies Used

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend** | Python / FastAPI | 3.12 / 0.143 | Async REST API with native OpenAPI |
| **Frontend** | React / Vite | 18.3 / 5.4 | Responsive inventory dashboard |
| **Database** | PostgreSQL | 16-alpine | Relational storage for products |
| **ORM / Migration** | SQLAlchemy / Alembic | 2.0 / 1.14 | Schema modelling & versioned migrations |
| **Testing** | Pytest / HTTPX | 8.3 / 0.28 | 11 API + logic test cases |
| **Containerization** | Docker & Compose | 24+ | Multi-stage builds, non-root, local stack |
| **Registry** | GitHub Container Registry | GHCR | SHA-tagged image catalog |
| **IaC** | Terraform | 1.7+ | AWS VPC + EKS provisioning |
| **Orchestration** | Kubernetes | 1.34 (EKS) | Deployment, self-healing, scaling |
| **Packaging** | Helm | 3.12+ | Parameterized templates & releases |
| **DevSecOps SAST** | Bandit | Latest | Python static security analysis |
| **DevSecOps SCA** | pip-audit / npm audit | Latest | Dependency CVE scanning |
| **DevSecOps Secrets** | Gitleaks | 8.x | Leaked-credential detection |
| **Container Security** | Aqua Trivy | 0.67 | Image CVE scanning (HIGH/CRITICAL gate) |
| **Observability** | Prometheus & Grafana | Latest | Metrics, alerting, dashboards |
| **GitOps** | ArgoCD | 2.11+ | Declarative continuous delivery |

---

## 4. Application Setup

StockDesk is a FastAPI service, a PostgreSQL database, and a Vite/React UI.

### Directory Layout
```text
backend/
├── app/
│   ├── config.py     # Pydantic settings (DATABASE_URL, app name)
│   ├── db.py         # SQLAlchemy engine & session factory
│   ├── models.py     # Product ORM model + stock-status derivation
│   ├── schemas.py    # Pydantic request/response schemas
│   └── main.py       # FastAPI routes + Prometheus instrumentation
├── alembic/          # DB migration scripts (0001_create_products)
├── tests/            # 11 Pytest cases
├── requirements.txt
└── Dockerfile
frontend/
├── src/{main.jsx, api.js, styles.css}
├── package.json
├── nginx.conf
└── Dockerfile
```

### Run the tests (M2 gate)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -v          # 11 passed
```

**11/11 passed (health, root, CRUD, status derivation, stats, metrics):**

![M2 pytest 11 passed](screenshot/m2-pytest-passing.png)

### Run the backend
```bash
export DATABASE_URL="postgresql+psycopg://stockdesk:stockdesk@localhost:5432/stockdesk"
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### API Endpoints
- `GET /` — service metadata & docs link
- `GET /health` — liveness probe (`{"status": "UP"}`)
- `GET /ready` — readiness probe, verifies DB (`{"status": "READY"}`)
- `GET /metrics` — Prometheus metrics
- `GET /api/products` — list all products
- `POST /api/products` — create a product
- `GET /api/products/{id}` — fetch one product
- `PUT /api/products/{id}` — update (recomputes stock status)
- `DELETE /api/products/{id}` — delete a product
- `GET /api/products/stats` — aggregates (`total`, `inStock`, `lowStock`, `outOfStock`)

**M1 evidence — FastAPI auto-docs at `/docs`:**

![M1 FastAPI Swagger docs](screenshot/m1-swagger-api-docs.png)

---

## 5. Docker Setup

Both components follow container best practices:
1. **Multi-stage builds** strip build toolchains from runtime images.
2. **Non-root execution** — backend runs as UID `10001`; frontend uses `nginxinc/nginx-unprivileged` (UID `101`, port `8080`).
3. **`.dockerignore`** keeps `.git`, `node_modules`, `.venv` and test DBs out of layers.

- **Backend:** `python:3.12-slim` → installs wheels → creates user `10001` → runs Alembic then Uvicorn.
- **Frontend:** stage 1 `node:22-alpine` builds static assets; stage 2 serves them from `nginxinc/nginx-unprivileged:1.30-alpine`.

### Local stack (M4)
```bash
docker compose up --build       # boots postgres + backend + frontend
docker compose ps
```

Access points:
- Frontend UI: `http://localhost:3000`
- Backend API docs: `http://localhost:8000/docs`
- Prometheus metrics: `http://localhost:8000/metrics`
- Database: `localhost:5432`

> If host port 5432 is already used by a local Postgres, stop it first (`sudo systemctl stop postgresql`) — the app itself talks to Postgres over the internal Docker network.

---

## 6. Kubernetes Deployment

Declarative manifests live in `kubernetes/` (an alternative to Helm for the raw-k8s requirement):

- `00-namespace.yaml` — namespace `stockdesk`
- `01-configmap.yaml` — non-sensitive config (`APP_NAME`, `ENVIRONMENT`, `DB_HOST`, `DB_NAME`)
- `02-secret.yaml` — DB credentials + `DATABASE_URL`
- `03-storage-pvc.yaml` — 5Gi PVC for Postgres
- `04-postgres.yaml` — PostgreSQL Deployment (`pg_isready` probes, `PGDATA` subdir for EBS)
- `05/06` — backend Deployment (2 replicas, `/health` + `/ready` probes) + ClusterIP Service `:8000`
- `07/08` — frontend Deployment (2 replicas) + ClusterIP Service `:80`
- `09-ingress.yaml` — Ingress (`/api` → backend, `/` → frontend)
- `10-hpa.yaml` — HPA, 60% CPU, 2→6 backend pods

```bash
kubectl apply -f kubernetes/
```

**App served through the EKS ingress ELB (2 backend + 2 frontend + 1 postgres Running):**

![M8 StockDesk via Ingress](screenshot/m8-app-via-ingress.png)

---

## 7. Helm Deployment

Helm packages the app into a parameterized, upgradeable release.

```text
helm/stockdesk/
├── Chart.yaml
├── values.yaml           # defaults
├── values-dev.yaml       # ingress enabled (stockdesk.local)
├── values-prod.yaml      # ingress on raw ELB host, HPA enabled
└── templates/
    ├── _helpers.tpl
    ├── backend-deployment.yaml / backend-service.yaml
    ├── frontend-deployment.yaml / frontend-service.yaml
    ├── postgres.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── servicemonitor.yaml
    └── grafana-dashboard.yaml
```

```bash
helm lint helm/stockdesk
SHA=$(git rev-parse HEAD)
helm upgrade --install stockdesk ./helm/stockdesk -n stockdesk --create-namespace \
  -f helm/stockdesk/values-prod.yaml \
  --set backend.image=ghcr.io/naren456/stockdesk-backend --set backend.tag=$SHA \
  --set frontend.image=ghcr.io/naren456/stockdesk-frontend --set frontend.tag=$SHA --wait
helm list -n stockdesk
kubectl get pods,svc,ingress,hpa -n stockdesk
```

---

## 8. Terraform Infrastructure

Terraform provisions AWS infrastructure in `ap-south-1`.

1. **VPC (`module.vpc`):** CIDR `10.20.0.0/16`; public subnets `10.20.101.0/24`, `10.20.102.0/24` (IGW); private subnets `10.20.1.0/24`, `10.20.2.0/24` (NAT).
2. **EKS (`module.eks`):** Kubernetes `1.34`, public endpoint, managed node group (`c7i-flex.large`, 2 nodes), IAM + OIDC.

```bash
cd terraform
terraform init
terraform validate
terraform plan
terraform apply
aws eks update-kubeconfig --region ap-south-1 --name stockdesk-eks
```

**`terraform apply` creating `stockdesk-eks` (cluster + node group + addons):**

![M7 terraform apply](screenshot/m7-terraform-apply.png)

### Teardown
```bash
terraform destroy      # mandatory after evaluation — EKS + NAT bill ~$0.20/hr
```

---

## 9. CI/CD Pipeline

Two GitHub Actions workflows run on push / PR to `main`:
- **`.github/workflows/ci-cd.yml`** — `test` → `build-scan-push` (Trivy + GHCR SHA tags) → `deploy` (Helm to EKS).
- **`.github/workflows/ci-cd-devsecops.yml`** — the DevSecOps-extended pipeline (Gitleaks, Bandit, SCA) ahead of the image gate.

```text
1. Build & Test   → Pytest unit tests, Vite frontend build
2. DevSecOps      → Gitleaks (secrets), Bandit (SAST), pip-audit / npm audit (SCA)
3. Security Gate  → Multi-stage Docker build + Trivy CVE scan (HIGH/CRITICAL)
4. GHCR Publish   → Push images tagged with the Git SHA
5. Deploy         → helm upgrade --install + kubectl rollout verification
```

- **Quality gates:** test failures or HIGH/CRITICAL findings abort the pipeline before images are pushed.
- **Traceability:** every image is tagged with the exact `${{ github.sha }}`.

![M5 GitHub Actions workflow runs](screenshot/m5-ci-cd-workflow-runs.png)

**GHCR package `stockdesk-backend` published with Git-SHA tags (`ghcr.io/naren456/stockdesk-backend:<sha>`):**

![M5 GHCR package with SHA tags](screenshot/m5-ghcr-packages.png)

---

## 10. DevSecOps Implementation

Security is shifted left across five controls (configs in `security/`):

1. **Secret Scanning (Gitleaks)** — `security/.gitleaks.toml`; scans commits for leaked tokens/keys.
2. **SAST (Bandit)** — `security/bandit.yaml`; flags SQL injection, unsafe shell exec, etc.
3. **SCA (pip-audit / npm audit)** — dependencies vs the NVD / GitHub Advisory DB.
4. **Container Scanning (Trivy)** — `security/trivy-config.yaml`; OS + library CVEs in built images.
5. **Enforced gate** — the pipeline exits non-zero on any unfixed HIGH/CRITICAL CVE.

Run all scans locally:
```bash
./security/run-security-scans.sh
```

---

## 11. Monitoring & Observability

Implemented with the **Prometheus + Grafana** stack:
- **Instrumentation:** `prometheus-fastapi-instrumentator` records request counts, latency histograms and in-flight requests.
- **Scraping:** Prometheus scrapes `/metrics` every 15s via the `ServiceMonitor`.
- **Dashboard (`StockDesk Backend`):** requests/sec per endpoint, 5xx error rate, p95 latency, backend pods up.
- **Alerts (`monitoring/alert-rules.yaml`):** `StockDeskBackendDown` (no scrape > 1 min) and `StockDeskHigh5xxErrorRate` (> 5% of traffic).

**`/metrics` returns Prometheus text:**

![M9 metrics endpoint](screenshot/m9-metrics-endpoint.png)

**Prometheus targets — `stockdesk-backend` 2/2 UP:**

![M9 Prometheus targets UP](screenshot/m9-prometheus-targets.png)

**Grafana dashboard — live panels (login `admin` / `stockdesk-admin`):**

![M9 Grafana dashboard](screenshot/m9-grafana-dashboard.png)

---

## 12. GitOps Workflow

GitOps with **ArgoCD** (manifests in `gitops/`):
- The Git repo is the **single source of truth**.
- ArgoCD watches `helm/stockdesk` and reconciles the cluster to the declared state.
- **Self-healing & drift detection:** manual `kubectl` changes are reverted to the Git-declared state.

```bash
kubectl apply -f gitops/appproject.yaml
kubectl apply -f gitops/argocd-application.yaml
```

**ArgoCD application `stockdesk-capstone`: Synced to `HEAD` and Healthy (17 resources), auto-sync enabled:**

![ArgoCD application Synced & Healthy](screenshot/argocd-synced-healthy.png)

See `gitops/README.md` for the full setup.

---

## 13. Troubleshooting Lab

`troubleshooting/` contains deliberately broken manifests for root-cause practice:

```text
broken-image.yaml    → ImagePullBackOff (bad image tag / nonexistent repository)
broken-service.yaml  → Service selector mismatch (empty endpoints, no routing)
```

### 6-step framework
1. **Identify:** `kubectl get pods -n stockdesk` — status & restart count.
2. **Investigate:** `kubectl describe pod <name>` and `kubectl logs <name> --previous`.
3. **Root cause:** pinpoint the mismatch (image, label, port, volume).
4. **Fix:** apply the corrected manifest/patch.
5. **Verify:** pods reach `Running (1/1)`, endpoints return `200 OK`.
6. **Post-mortem:** record cause, impact, remediation, prevention.

---

## 14. Lessons Learned

**Semantic commit history (rebuild to StockDesk, taskboard→stockdesk rename, Helm/Postgres/EBS fixes):**

![M3 git commit history](screenshot/m3-commit-history.png)

### Gap analysis — what was added
1. **DevSecOps suite:** added `security/` (Bandit, Gitleaks, Trivy config, scan script) and a dedicated `ci-cd-devsecops.yml` on top of the existing Trivy gate.
2. **Raw Kubernetes manifests:** added `kubernetes/00–10` (ConfigMap, Secret, PVC, Deployments, Services, Ingress, HPA) alongside the Helm chart.
3. **GitOps:** added `gitops/` (ArgoCD `Application` + `AppProject`).
4. **Monitoring depth:** added `monitoring/alert-rules.yaml` and `monitoring/servicemonitor.yaml` plus a dashboard shipped in the Helm chart.
5. **EKS-specific fixes found by actually deploying:** `alembic.ini` `prepend_sys_path` (so migrations import `app` in-container) and Postgres `PGDATA` subdir (so `initdb` works on an EBS volume with `lost+found`).

### External prerequisites
1. **AWS account + IAM** with VPC/EC2/EKS/NAT/IAM/CloudWatch permissions. EKS + NAT cost ~$0.20/hr — run `terraform destroy` right after capturing evidence.
2. **GitHub secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` for the deploy job; workflow permissions set to read/write so GHCR can store images.
3. **In-cluster add-ons:** ingress-nginx (Ingress), metrics-server (HPA CPU), kube-prometheus-stack (monitoring) — installed by `./scripts/bootstrap-cluster.sh`.
4. **Local toolchain:** Python venv + `requirements.txt` for Pytest; Node 20+ for the frontend build.

---

See [`STUDENT-GUIDE.md`](STUDENT-GUIDE.md) for a step-by-step walkthrough and [`GRADING.md`](GRADING.md) for the rubric.
