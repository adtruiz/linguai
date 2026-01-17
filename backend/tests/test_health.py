"""Tests for health endpoints"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    """Test basic health check returns healthy status"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_root_endpoint():
    """Test root endpoint returns API info"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "LinguAI API"
    assert "version" in data
    assert data["status"] == "running"


def test_readiness_check():
    """Test readiness check endpoint"""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "checks" in data
    assert "parselmouth" in data["checks"]
