TASK = {"title": "Deploy application", "priority": "HIGH", "assignee": "Student"}

def make_task(client):
    return client.post("/api/tasks", json=TASK).json()

def test_health(client):
    assert client.get("/health").json() == {"status": "UP"}

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "TaskBoard API"

def test_create_task(client):
    response = client.post("/api/tasks", json=TASK)
    assert response.status_code == 201
    assert response.json()["title"] == "Deploy application"

def test_create_task_rejects_empty_title(client):
    assert client.post("/api/tasks", json={"title": ""}).status_code == 422

def test_list_tasks(client):
    make_task(client)
    assert len(client.get("/api/tasks").json()) == 1

def test_update_task(client):
    task = make_task(client)
    response = client.put(f"/api/tasks/{task['id']}", json={"status": "DONE"})
    assert response.status_code == 200
    assert response.json()["status"] == "DONE"

def test_delete_task(client):
    task = make_task(client)
    assert client.delete(f"/api/tasks/{task['id']}").status_code == 204
    assert client.get(f"/api/tasks/{task['id']}").status_code == 404

def test_get_missing_task_returns_404(client):
    assert client.get("/api/tasks/9999").status_code == 404

def test_stats_counts_by_status(client):
    task = make_task(client)
    client.put(f"/api/tasks/{task['id']}", json={"status": "DONE"})
    make_task(client)
    assert client.get("/api/tasks/stats").json() == {"total": 2, "todo": 1, "inProgress": 0, "done": 1}

def test_metrics_exposes_prometheus_format(client):
    client.get("/health")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
