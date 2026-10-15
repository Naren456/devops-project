import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from app.db import Base, engine
from app.main import app

@pytest.fixture()
def client():
    # Fresh tables for every test; `with` runs the app's startup handler.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
