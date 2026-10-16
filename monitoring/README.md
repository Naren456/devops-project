# Observability — Prometheus + Grafana (Module M9)

The StockDesk backend exposes a `/metrics` endpoint in Prometheus format.
Prometheus scrapes it via a `ServiceMonitor`, and Grafana visualises the data.

## Architecture

```
StockDesk backend (/metrics)  →  ServiceMonitor  →  Prometheus  →  Grafana
```

- The `ServiceMonitor` lives in the Helm chart (`helm/stockdesk/templates/servicemonitor.yaml`)
  and is created in the `stockdesk` namespace.
- Prometheus is installed with `kube-prometheus-stack`, which auto-discovers the
  `ServiceMonitor` and pre-provisions a **Prometheus datasource** in Grafana.

## Metrics exposed by the app

| Metric | Type | Meaning |
|--------|------|---------|
| `http_requests_total` | counter | Total HTTP requests, labelled with `method`, `handler`, `status` |
| `http_request_duration_seconds` | histogram | Request latency distribution |
| `python_info` | gauge | Python/build info (standard `prometheus_client`) |

## Install (local minikube / kind)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring -f monitoring/prometheus-values.yaml
```

> **Memory note:** `kube-prometheus-stack` is heavy. On a small local cluster
> (minikube with < 4 GB), delete the backend HPA and pin replicas to 1 to keep
> the node stable:
> ```bash
> kubectl delete hpa stockdesk-backend -n stockdesk
> kubectl scale deployment/stockdesk-stockdesk-backend -n stockdesk --replicas=1
> ```

## Access the UIs (port-forward)

```bash
# Grafana   ->  http://localhost:3001   (admin / admin)
kubectl port-forward svc/prometheus-grafana -n monitoring 3001:80

# Prometheus -> http://localhost:9090
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090
```

Grafana password (if needed):
```bash
kubectl get secret prometheus-grafana -n monitoring \
  -o jsonpath="{.data.admin-password}" | base64 -d; echo
```

## Verify the scrape is UP

```bash
# Prometheus → Status → Targets, or via API:
curl -s 'http://localhost:9090/api/v1/targets' | \
  python3 -c "import sys,json;d=json.load(sys.stdin);\
  [print(t['scrapeUrl'],t['health']) for t in d['data']['activeTargets'] if t['labels'].get('namespace')=='stockdesk']"
# Expect: http://10.244.x.x:8000/metrics | health: up
```

## Build the required Grafana panel (M9)

1. Open Grafana → **Dashboards → New → Add visualization**.
2. Datasource is already the default **Prometheus**.
3. Add a panel with this query to show live request rate:

   ```
   sum by (handler, status) (rate(http_requests_total[1m]))
   ```

4. Add a second panel for request volume:

   ```
   http_requests_total
   ```

5. **Generate traffic** so the panel is populated:

   ```bash
   kubectl exec deploy/stockdesk-stockdesk-backend -n stockdesk -- \
     python3 -c "import urllib.request as u;[u.urlopen('http://localhost:8000/api/products') for _ in range(10)]"
   ```

The panel will now show a populated graph — screenshot it for the M9 submission.
