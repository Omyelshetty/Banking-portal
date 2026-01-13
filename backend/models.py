from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

# ================= ENUMS =================

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CUSTOMER = "customer"

class AccountType(str, enum.Enum):
    SAVINGS = "savings"
    CHECKING = "checking"

class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    BLOCKED = "blocked"
    CLOSED = "closed"

class TransactionType(str, enum.Enum):
    TRANSFER = "transfer"
    DEPOSIT = "deposit"
    WITHDRAW = "withdraw"

# ================= USER =================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    customer = relationship("Customer", back_populates="user", uselist=False)
    created_by = relationship("User", remote_side=[id])
    created_staff = relationship("User", foreign_keys=[created_by_id])

# ================= CUSTOMER =================

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    phone = Column(String(20))
    address = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="customer")
    accounts = relationship("Account", back_populates="customer")

# ================= ACCOUNT =================

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    account_number = Column(String(20), unique=True, index=True, nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False, default=AccountType.SAVINGS)
    status = Column(SQLEnum(AccountStatus), nullable=False, default=AccountStatus.ACTIVE)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="accounts")
    transactions_from = relationship("Transaction", foreign_keys="Transaction.from_account_id", back_populates="from_account")
    transactions_to = relationship("Transaction", foreign_keys="Transaction.to_account_id", back_populates="to_account")

# ================= TRANSACTION =================

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    amount = Column(Float, nullable=False)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    description = Column(String(255), nullable=True)

    # Relationships
    from_account = relationship("Account", foreign_keys=[from_account_id], back_populates="transactions_from")
    to_account = relationship("Account", foreign_keys=[to_account_id], back_populates="transactions_to")


# ================= USER SESSION =================

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    login_time = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    logout_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Float, nullable=True)

    user = relationship("User")
