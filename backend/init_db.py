"""
Initialize database with admin user
Run this script once to create the admin user
"""
from database import SessionLocal, engine, Base
from models import User, UserRole
from auth import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@bank.com").first()
        if not admin:
            admin_user = User(
                name="Admin User",
                email="admin@bank.com",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=1
            )
            db.add(admin_user)
            db.commit()
            print("✅ Admin user created!")
            print("Email: admin@bank.com")
            print("Password: admin123")
        else:
            print("ℹ️  Admin user already exists")
        
        # Create a sample staff user
        staff = db.query(User).filter(User.email == "staff@bank.com").first()
        if not staff:
            staff_user = User(
                name="Staff User",
                email="staff@bank.com",
                password_hash=get_password_hash("staff123"),
                role=UserRole.STAFF,
                is_active=1
            )
            db.add(staff_user)
            db.commit()
            print("✅ Staff user created!")
            print("Email: staff@bank.com")
            print("Password: staff123")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
