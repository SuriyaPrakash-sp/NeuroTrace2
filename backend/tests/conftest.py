import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="neurotrace_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["MAX_UPLOAD_MB"] = "1"
os.environ["AI_ENABLED"] = "false"
os.environ["DEMO_ANALYSIS"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:  # runs lifespan -> creates tables
        yield c
