from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from models import UserRole, AccountType, AccountStatus, TransactionType

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CUSTOMER

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True

# Customer Schemas
class CustomerBase(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    user_id: int

class CustomerResponse(CustomerBase):
    id: int
    user_id: int
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# Account Schemas
class AccountBase(BaseModel):
    account_type: AccountType
    status: AccountStatus = AccountStatus.ACTIVE

class AccountCreate(AccountBase):
    customer_id: int
    initial_balance: float = 0.0

class AccountResponse(AccountBase):
    id: int
    customer_id: int
    account_number: str
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float
    transaction_type: TransactionType
    description: Optional[str] = None

class TransactionCreate(TransactionBase):
    from_account_id: Optional[int] = None
    to_account_id: Optional[int] = None

class TransactionResponse(TransactionBase):
    id: int
    from_account_id: Optional[int]
    to_account_id: Optional[int]
    timestamp: datetime
    from_account_number: Optional[str] = None
    to_account_number: Optional[str] = None

    class Config:
        from_attributes = True

# Staff Operations
class CreateCustomerRequest(UserBase, CustomerBase):
    password: str
    account_type: AccountType = AccountType.SAVINGS
    initial_balance: float = 0.0

class DepositWithdrawRequest(BaseModel):
    account_id: int
    amount: float
    description: Optional[str] = None

class TransferRequest(BaseModel):
    from_account_id: int
    to_account_number: str
    amount: float
    description: Optional[str] = None

# Admin Operations
class CreateStaffRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class UpdateUserStatusRequest(BaseModel):
    user_id: int
    is_active: int

class OpenAccountRequest(BaseModel):
    customer_id: int
    account_type: AccountType = AccountType.SAVINGS
    initial_balance: float = 0.0


class StaffApproveCustomerRequest(BaseModel):
    user_id: int
    approve: bool

# Dashboard Stats

class SessionSummary(BaseModel):
    id: int
    user_id: int
    user_name: str
    login_time: datetime
    logout_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None


class DashboardStats(BaseModel):
    total_users: int
    total_customers: int
    total_staff: int
    total_accounts: int
    total_balance: float
    total_transactions: int
    recent_transactions: List[TransactionResponse]
    recent_sessions: List[SessionSummary]