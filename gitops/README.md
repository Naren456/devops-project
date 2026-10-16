# GitOps Workflow Architecture with ArgoCD

## Overview
GitOps establishes Git as the **single source of truth** for infrastructure and application state. Instead of pushing changes via `kubectl apply` or direct CI runners (Push model), an in-cluster controller (ArgoCD) continuously reconciles actual cluster state against the desired state declared in Git (Pull model).

```text
+---------------+        +----------------------+        +-----------------------+
|  Git Commit   | =====> |  GitHub Repository   | =====> |  ArgoCD Controller    |
| (Desired State)|        |  (Source of Truth)   |        |  (Continuous Reconcile|
+---------------+        +----------------------+        +-----------+-----------+
                                                                     |
                                                                     v
                                                          +-----------------------+
                                                          |  Kubernetes Cluster   |
                                                          |    (Actual State)     |
                                                          +-----------------------+
```

## How It Works
1. When the CI pipeline builds and scans new container images, it generates a commit updating image tags in `helm/stockdesk/values.yaml` or declarative manifests.
2. ArgoCD detects the commit in the Git repository.
3. ArgoCD compares the desired state in Git against the live cluster state.
4. If drift occurs (e.g. manual changes, pod crashes, or new version pushed), ArgoCD performs automated self-healing and synchronizes the cluster.

## Deployment Steps
1. Install ArgoCD in the cluster:
   ```bash
   kubectl create namespace argocd
   kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
   ```
2. Retrieve initial admin password:
   ```bash
   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
   ```
3. Apply the Application CRD:
   ```bash
   kubectl apply -f gitops/argocd-application.yaml
   ```
4. Access ArgoCD UI via port-forward:
   ```bash
   kubectl port-forward svc/argocd-server -n argocd 8080:443
   ```
