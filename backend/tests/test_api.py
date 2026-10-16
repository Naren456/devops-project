PRODUCT = {"name": "USB-C Cable", "sku": "Cbl-001", "category": "Accessories", "quantity": 20, "price": 9.99}

def make_product(client, **overrides):
    return client.post("/api/products", json={**PRODUCT, **overrides}).json()

def test_health(client):
    assert client.get("/health").json() == {"status": "UP"}

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "StockDesk API"

def test_create_product(client):
    response = client.post("/api/products", json=PRODUCT)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "USB-C Cable"
    assert body["status"] == "IN_STOCK"

def test_create_product_rejects_empty_name(client):
    assert client.post("/api/products", json={**PRODUCT, "name": ""}).status_code == 422

def test_list_products(client):
    make_product(client)
    assert len(client.get("/api/products").json()) == 1

def test_status_is_derived_from_quantity(client):
    assert make_product(client, quantity=0)["status"] == "OUT_OF_STOCK"
    assert make_product(client, quantity=3)["status"] == "LOW_STOCK"
    assert make_product(client, quantity=50)["status"] == "IN_STOCK"

def test_update_product_recomputes_status(client):
    product = make_product(client, quantity=20)
    response = client.put(f"/api/products/{product['id']}", json={"quantity": 2})
    assert response.status_code == 200
    assert response.json()["quantity"] == 2
    assert response.json()["status"] == "LOW_STOCK"

def test_delete_product(client):
    product = make_product(client)
    assert client.delete(f"/api/products/{product['id']}").status_code == 204
    assert client.get(f"/api/products/{product['id']}").status_code == 404

def test_get_missing_product_returns_404(client):
    assert client.get("/api/products/9999").status_code == 404

def test_stats_counts_by_status(client):
    make_product(client, quantity=0)
    make_product(client, quantity=3)
    make_product(client, quantity=50)
    assert client.get("/api/products/stats").json() == {
        "total": 3, "inStock": 1, "lowStock": 1, "outOfStock": 1,
    }

def test_metrics_exposes_prometheus_format(client):
    client.get("/health")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
