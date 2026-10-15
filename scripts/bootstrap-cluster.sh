#!/usr/bin/env bash
# Install the cluster add-ons the TaskBoard chart depends on:
#   ingress-nginx          -> Ingress routing (/ -> frontend, /api -> backend)
#   metrics-server         -> CPU metrics for the HPA
#   kube-prometheus-stack  -> Prometheus, Grafana and the ServiceMonitor CRD
# Safe to re-run: every step is an idempotent `helm upgrade --install`.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo update >/dev/null

kubectl apply -f "$ROOT/k8s/namespace.yaml"
# EKS needs a default StorageClass for the Postgres PVC; kind/minikube already have one.
if kubectl get csidriver ebs.csi.aws.com >/dev/null 2>&1; then
  kubectl apply -f "$ROOT/k8s/storageclass-gp3.yaml"
fi

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace ${INGRESS_VALUES:+-f "$INGRESS_VALUES"} --wait --timeout 10m

helm upgrade --install metrics-server metrics-server/metrics-server \
  -n kube-system ${METRICS_SERVER_ARGS:-} --wait --timeout 5m

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f "$ROOT/monitoring/prometheus-values.yaml" --wait --timeout 15m

echo "Cluster add-ons ready."
