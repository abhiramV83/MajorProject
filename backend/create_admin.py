"""Create the first Neon-backed app administrator interactively."""

from getpass import getpass

from app.auth.auth import get_password_hash
from app.database.connection import SessionLocal
from app.models.db_models import User, UserRole


def main():
    email = input("Admin email: ").strip().lower()
    if not email or "@" not in email:
        raise SystemExit("Enter a valid email address.")
    password = getpass("Password (at least 12 characters): ")
    if len(password) < 12 or password != getpass("Confirm password: "):
        raise SystemExit("Passwords must match and be at least 12 characters.")

    with SessionLocal() as db:
        if db.query(User).filter_by(email=email).first():
            raise SystemExit("This email already exists.")
        db.add(
            User(
                email=email,
                full_name=input("Full name: ").strip() or "Administrator",
                hashed_password=get_password_hash(password),
                role=UserRole.ADMIN,
            )
        )
        db.commit()
    print("Admin account created.")


if __name__ == "__main__":
    main()
