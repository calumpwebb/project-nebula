# Observability Stack Design

**Ticket:** NEBULA-0v4
**Follow-up:** NEBULA-wlh (Prometheus scraping targets)

## Overview

Deploy Prometheus, Grafana, and Loki to k3d cluster. Loki fully configured with Promtail DaemonSet collecting all pod logs. Grafana with JSON dashboard provisioning. 90-day retention for logs and metrics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         k3d Cluster                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Temporal   │  │    Convex    │  │    Worker    │  ...pods  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         │    ┌────────────┴────────────┐    │                    │
│         │    │   Promtail DaemonSet    │    │                    │
│         │    │   (tails all pod logs)  │    │                    │
│         │    └────────────┬────────────┘    │                    │
│         │                 │                 │                    │
│         │                 ▼                 │                    │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │  Prometheus  │  │     Loki     │                             │
│  │  (metrics)   │  │   (logs)     │                             │
│  │  90d retain  │  │  90d retain  │                             │
│  └──────┬───────┘  └──────┬───────┘                             │
│         │                 │                                      │
│         └────────┬────────┘                                      │
│                  ▼                                               │
│         ┌──────────────┐                                        │
│         │   Grafana    │                                        │
│         │  :3000       │                                        │
│         └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### Prometheus

- Image: `prom/prometheus:v2.50.1`
- Port: 9090
- Storage: 10Gi PVC at `/prometheus`
- Config: `--storage.tsdb.retention.time=90d`
- No scrape targets initially (deferred to NEBULA-wlh)

### Loki

- Image: `grafana/loki:2.9.4`
- Port: 3100
- Storage: 20Gi PVC at `/loki`
- Config: Single-binary mode, filesystem storage, 90-day retention

### Promtail

- Image: `grafana/promtail:2.9.4`
- DaemonSet (one per node)
- Mounts `/var/log/pods` read-only
- Ships to `http://loki:3100/loki/api/v1/push`
- Labels: namespace, pod, container, app

### Grafana

- Image: `grafana/grafana:10.3.1`
- Port: 3000
- No persistent storage (dashboards from provisioning)
- Anonymous access enabled for dev
- Datasources + dashboards mounted via ConfigMaps

## Port Allocations

| Service    | Internal | Exposed (dev) |
| ---------- | -------- | ------------- |
| Prometheus | 9090     | 9090          |
| Loki       | 3100     | 3100          |
| Grafana    | 3000     | 3000          |

## File Structure

```
apps/
├── grafana/
│   └── deploy/
│       ├── manifest.ts
│       └── provisioning/
│           ├── datasources/
│           │   └── datasources.yaml
│           └── dashboards/
│               ├── dashboards.yaml
│               └── meta/
│                   └── storage.json
├── prometheus/
│   └── deploy/
│       └── manifest.ts
├── loki/
│   └── deploy/
│       └── manifest.ts
└── promtail/
    └── deploy/
        └── manifest.ts
```

## Promtail Pipeline

```yaml
scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
    pipeline_stages:
      - json:
          expressions:
            level: level
            msg: msg
          source: log
      - output:
          source: log
```

## Grafana Provisioning

### Datasources

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true
  - name: Loki
    type: loki
    url: http://loki:3100
```

### Dashboards

1. **Storage Meta** - Loki ingestion rate, storage size, log volume by app

## Deferred (NEBULA-wlh)

- Prometheus scrape configs for Temporal Server/Worker
- Worker `Runtime.install()` changes for metrics export
- Temporal prebuilt dashboards
- Convex function instrumentation
