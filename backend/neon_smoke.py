"""Temporary Neon-backed API smoke test; removes its test user afterward."""

import json
import secrets
import urllib.request
from uuid import uuid4

from app.auth.auth import get_password_hash
from app.database.connection import SessionLocal
from app.models.db_models import AuditLog, User, UserRole


BASE_URL = "http://127.0.0.1:8000/api"


def request(path, *, token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(
        urllib.request.Request(BASE_URL + path, data=payload, headers=headers),
        timeout=30,
    ) as response:
        return response.status, json.load(response)


def main():
    status, health = request("/health")
    assert status == 200 and health["status"] == "healthy"
    print("GET /api/health: 200, Neon SELECT 1 passed")

    email = f"neon-smoke-{uuid4().hex}@example.invalid"
    password = secrets.token_urlsafe(24)
    user_id = None
    try:
        with SessionLocal() as db:
            user = User(
                email=email,
                full_name="Neon Smoke Test",
                hashed_password=get_password_hash(password),
                role=UserRole.ADMIN,
            )
            db.add(user)
            db.commit()
            user_id = user.id
            assert db.query(User).filter_by(id=user_id).one().email == email
        print("Neon write/read: temporary user committed and retrieved")

        status, login = request("/auth/login", body={"email": email, "password": password})
        assert status == 200 and login["user"]["email"] == email
        token = login["access_token"]
        print("POST /api/auth/login: 200, Neon-backed authentication passed")

        status, me = request("/auth/me", token=token)
        assert status == 200 and me["email"] == email
        print("GET /api/auth/me: 200, authenticated Neon read passed")

        status, _ = request("/participants", token=token)
        assert status == 200
        print("GET /api/participants: 200, Neon-backed list passed")
    finally:
        if user_id is not None:
            with SessionLocal() as db:
                db.query(AuditLog).filter_by(user_id=user_id).delete()
                db.query(User).filter_by(id=user_id).delete()
                db.commit()
            print("Temporary user and its audit entries removed")


if __name__ == "__main__":
    main()
