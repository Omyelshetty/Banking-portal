from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import io

from database import get_db, engine, Base
from models import User, Customer, Account, Transaction, UserRole, TransactionType, AccountStatus, Session
from schemas import (
    LoginRequest, Token, UserCreate, UserResponse, CustomerResponse,
    AccountResponse, TransactionResponse, CreateCustomerRequest,
    DepositWithdrawRequest, TransferRequest, CreateStaffRequest,
    UpdateUserStatusRequest, DashboardStats, OpenAccountRequest,
    RegisterRequest, StaffApproveCustomerRequest, SessionSummary
)
from auth import (
    authenticate_user, create_access_token, get_current_user,
    get_password_hash, require_admin, require_staff, require_customer
)
from services import (
    create_customer_with_account, deposit_money, withdraw_money, transfer_money
)

# Create database tables
Base.metadata.create_all(bind=engine)
from auth import get_password_hash

def seed_default_users():
    db = next(get_db())

    # Admin
    admin = db.query(User).filter(User.email == "admin@bank.com").first()
    if not admin:
        admin = User(
            name="Bank Admin",
            email="admin@bank.com",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            is_active=1
        )
        db.add(admin)

    # Staff
    staff = db.query(User).filter(User.email == "staff@bank.com").first()
    if not staff:
        staff = User(
            name="Bank Staff",
            email="staff@bank.com",
            password_hash=get_password_hash("staff123"),
            role=UserRole.STAFF,
            is_active=1
        )
        db.add(staff)

    db.commit()
    print("Default Admin & Staff users ensured")
    
app = FastAPI(title="Banking API", version="1.0.0")

@app.on_event("startup")
def startup_event():
    seed_default_users()



# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== AUTHENTICATION ====================

@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Record login session
    db_session = Session(user_id=user.id, login_time=datetime.utcnow())
    db.add(db_session)
    db.commit()

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/api/auth/register", response_model=UserResponse)
async def register_user(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.CUSTOMER,
        is_active=0,  # pending approval
        created_by_id=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    customer = Customer(
        user_id=user.id,
        phone=data.phone or "",
        address=data.address or "",
    )
    db.add(customer)
    db.commit()
    db.refresh(user)

    return user


@app.post("/api/auth/logout")
async def logout_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find the latest open session for this user
    session = (
        db.query(Session)
        .filter(Session.user_id == current_user.id, Session.logout_time.is_(None))
        .order_by(Session.login_time.desc())
        .first()
    )
    if session:
        now = datetime.utcnow()
        session.logout_time = now
        if session.login_time:
            session.duration_seconds = (now - session.login_time).total_seconds()
        db.commit()

    return {"message": "Logged out"}

# ==================== CUSTOMER ENDPOINTS ====================

@app.get("/api/customer/accounts", response_model=List[AccountResponse])
async def get_my_accounts(
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer profile not found"
        )
    
    accounts = db.query(Account).filter(Account.customer_id == customer.id).all()
    return accounts

@app.get("/api/customer/transactions", response_model=List[TransactionResponse])
async def get_my_transactions(
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
    limit: int = 50
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer profile not found"
        )
    
    accounts = db.query(Account.id).filter(Account.customer_id == customer.id).subquery()
    
    transactions = db.query(Transaction).filter(
        (Transaction.from_account_id.in_(db.query(accounts.c.id))) |
        (Transaction.to_account_id.in_(db.query(accounts.c.id)))
    ).order_by(Transaction.timestamp.desc()).limit(limit).all()
    
    # Add account numbers to response
    result = []
    for txn in transactions:
        txn_dict = {
            "id": txn.id,
            "from_account_id": txn.from_account_id,
            "to_account_id": txn.to_account_id,
            "amount": txn.amount,
            "transaction_type": txn.transaction_type,
            "timestamp": txn.timestamp,
            "description": txn.description,
            "from_account_number": txn.from_account.account_number if txn.from_account else None,
            "to_account_number": txn.to_account.account_number if txn.to_account else None,
        }
        result.append(TransactionResponse(**txn_dict))
    
    return result

@app.post("/api/customer/transfer")
async def customer_transfer(
    transfer_data: TransferRequest,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer profile not found"
        )
    
    # Verify the account belongs to the customer
    from_account = db.query(Account).filter(
        Account.id == transfer_data.from_account_id,
        Account.customer_id == customer.id
    ).first()
    
    if not from_account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account does not belong to you"
        )
    
    from_acc, to_acc, txn = transfer_money(db, transfer_data)
    
    return {
        "message": "Transfer successful",
        "transaction": TransactionResponse(
            id=txn.id,
            from_account_id=txn.from_account_id,
            to_account_id=txn.to_account_id,
            amount=txn.amount,
            transaction_type=txn.transaction_type,
            timestamp=txn.timestamp,
            description=txn.description,
            from_account_number=from_acc.account_number,
            to_account_number=to_acc.account_number
        ),
        "new_balance": from_acc.balance
    }

@app.get("/api/customer/statement/{account_id}")
async def get_bank_statement(
    account_id: int,
    current_user: User = Depends(require_customer),
    db: Session = Depends(get_db),
    format: str = "json"
):
    customer = db.query(Customer).filter(Customer.user_id == current_user.id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer profile not found"
        )
    
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.customer_id == customer.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    transactions = db.query(Transaction).filter(
        (Transaction.from_account_id == account_id) |
        (Transaction.to_account_id == account_id)
    ).order_by(Transaction.timestamp.desc()).all()
    
    transactions_data = [
        TransactionResponse(
            id=txn.id,
            from_account_id=txn.from_account_id,
            to_account_id=txn.to_account_id,
            amount=txn.amount,
            transaction_type=txn.transaction_type,
            timestamp=txn.timestamp,
            description=txn.description,
            from_account_number=txn.from_account.account_number if txn.from_account else None,
            to_account_number=txn.to_account.account_number if txn.to_account else None,
        )
        for txn in transactions
    ]
    
    if format == "pdf":
        try:
            from pdf_generator import generate_bank_statement
            account_dict = {
                "account_number": account.account_number,
                "account_type": account.account_type.value,
                "balance": float(account.balance),
                "status": account.status.value
            }
            transactions_dict = [
                {
                    "timestamp": txn.timestamp.isoformat() if hasattr(txn.timestamp, 'isoformat') else str(txn.timestamp),
                    "transaction_type": txn.transaction_type.value,
                    "from_account_number": txn.from_account.account_number if txn.from_account else None,
                    "to_account_number": txn.to_account.account_number if txn.to_account else None,
                    "amount": float(txn.amount),
                    "description": txn.description or ""
                }
                for txn in transactions
            ]
            pdf_buffer = generate_bank_statement(account_dict, transactions_dict)
            pdf_buffer.seek(0)
            return StreamingResponse(
                pdf_buffer,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=statement_{account.account_number}.pdf"
                }
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to generate PDF: {str(e)}"
            )
    
    return {
        "account": AccountResponse.model_validate(account),
        "transactions": transactions_data
    }

# ==================== STAFF ENDPOINTS ====================

@app.post("/api/staff/customers", response_model=UserResponse)
async def create_customer(
    customer_data: CreateCustomerRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    user, customer, account = create_customer_with_account(db, customer_data, current_user.id)
    return user

@app.get("/api/staff/customers", response_model=List[CustomerResponse])
async def get_all_customers(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    customers = db.query(Customer).join(User).filter(User.role == UserRole.CUSTOMER).all()
    return customers


@app.get("/api/staff/customers/pending", response_model=List[CustomerResponse])
async def get_pending_customers(
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    customers = (
        db.query(Customer)
        .join(User)
        .filter(
            User.role == UserRole.CUSTOMER,
            User.is_active == 0,
            User.created_by_id.is_(None),
        )
        .all()
    )
    return customers


@app.post("/api/staff/customers/approve")
async def approve_or_reject_customer(
    payload: StaffApproveCustomerRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == payload.user_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if payload.approve:
        user.is_active = 1
        db.commit()
        return {"message": "Customer approved"}
    else:
        # Delete related customer and any accounts for cleanup
        customer = db.query(Customer).filter(Customer.user_id == user.id).first()
        if customer:
            db.query(Account).filter(Account.customer_id == customer.id).delete()
            db.delete(customer)
        db.delete(user)
        db.commit()
        return {"message": "Customer rejected and removed"}

@app.post("/api/staff/deposit")
async def staff_deposit(
    deposit_data: DepositWithdrawRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    account, txn = deposit_money(db, deposit_data)
    return {
        "message": "Deposit successful",
        "account": AccountResponse.model_validate(account),
        "transaction": TransactionResponse(
            id=txn.id,
            from_account_id=txn.from_account_id,
            to_account_id=txn.to_account_id,
            amount=txn.amount,
            transaction_type=txn.transaction_type,
            timestamp=txn.timestamp,
            description=txn.description,
            from_account_number=None,
            to_account_number=account.account_number
        )
    }

@app.post("/api/staff/withdraw")
async def staff_withdraw(
    withdraw_data: DepositWithdrawRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    account, txn = withdraw_money(db, withdraw_data)
    return {
        "message": "Withdrawal successful",
        "account": AccountResponse.model_validate(account),
        "transaction": TransactionResponse(
            id=txn.id,
            from_account_id=txn.from_account_id,
            to_account_id=txn.to_account_id,
            amount=txn.amount,
            transaction_type=txn.transaction_type,
            timestamp=txn.timestamp,
            description=txn.description,
            from_account_number=account.account_number,
            to_account_number=None
        )
    }

@app.get("/api/staff/accounts/{customer_id}", response_model=List[AccountResponse])
async def get_customer_accounts(
    customer_id: int,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    accounts = db.query(Account).filter(Account.customer_id == customer_id).all()
    return accounts

@app.post("/api/staff/accounts", response_model=AccountResponse)
async def open_account(
    account_data: OpenAccountRequest,
    current_user: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    from services import generate_account_number
    
    customer = db.query(Customer).filter(Customer.id == account_data.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    account_number = generate_account_number()
    while db.query(Account).filter(Account.account_number == account_number).first():
        account_number = generate_account_number()
    
    db_account = Account(
        customer_id=customer.id,
        account_number=account_number,
        balance=account_data.initial_balance,
        account_type=account_data.account_type,
        status=AccountStatus.ACTIVE
    )
    db.add(db_account)
    
    if account_data.initial_balance > 0:
        db_transaction = Transaction(
            from_account_id=None,
            to_account_id=db_account.id,
            amount=account_data.initial_balance,
            transaction_type=TransactionType.DEPOSIT,
            description="Initial deposit"
        )
        db.add(db_transaction)
    
    db.commit()
    db.refresh(db_account)
    
    return db_account

# ==================== ADMIN ENDPOINTS ====================

@app.post("/api/admin/staff", response_model=UserResponse)
async def create_staff(
    staff_data: CreateStaffRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(User.email == staff_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    db_user = User(
        name=staff_data.name,
        email=staff_data.email,
        password_hash=get_password_hash(staff_data.password),
        role=UserRole.STAFF,
        is_active=1,
        created_by_id=current_user.id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/admin/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    return users

@app.put("/api/admin/users/status")
async def update_user_status(
    status_data: UpdateUserStatusRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if status_data.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status"
        )
    
    user = db.query(User).filter(User.id == status_data.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = status_data.is_active
    db.commit()
    db.refresh(user)
    return {"message": "User status updated", "user": UserResponse.model_validate(user)}

@app.get("/api/admin/transactions", response_model=List[TransactionResponse])
async def get_all_transactions(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 100
):
    transactions = db.query(Transaction).order_by(Transaction.timestamp.desc()).limit(limit).all()
    
    result = []
    for txn in transactions:
        result.append(TransactionResponse(
            id=txn.id,
            from_account_id=txn.from_account_id,
            to_account_id=txn.to_account_id,
            amount=txn.amount,
            transaction_type=txn.transaction_type,
            timestamp=txn.timestamp,
            description=txn.description,
            from_account_number=txn.from_account.account_number if txn.from_account else None,
            to_account_number=txn.to_account.account_number if txn.to_account else None,
        ))
    
    return result

@app.get("/api/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(func.count(User.id)).scalar()
    total_customers = db.query(func.count(User.id)).filter(User.role == UserRole.CUSTOMER).scalar()
    total_staff = db.query(func.count(User.id)).filter(User.role == UserRole.STAFF).scalar()
    total_accounts = db.query(func.count(Account.id)).scalar()
    total_balance = db.query(func.sum(Account.balance)).scalar() or 0.0
    total_transactions = db.query(func.count(Transaction.id)).scalar()
    
    recent_transactions = db.query(Transaction).order_by(Transaction.timestamp.desc()).limit(10).all()

    recent_txns_list = []
    for txn in recent_transactions:
        recent_txns_list.append(TransactionResponse(
            id=txn.id,
            from_account_id=txn.from_account_id,
            to_account_id=txn.to_account_id,
            amount=txn.amount,
            transaction_type=txn.transaction_type,
            timestamp=txn.timestamp,
            description=txn.description,
            from_account_number=txn.from_account.account_number if txn.from_account else None,
            to_account_number=txn.to_account.account_number if txn.to_account else None,
        ))

    recent_sessions_q = (
        db.query(Session, User)
        .join(User, Session.user_id == User.id)
        .order_by(Session.login_time.desc())
        .limit(10)
        .all()
    )
    recent_sessions = [
        SessionSummary(
            id=sess.id,
            user_id=user.id,
            user_name=user.name,
            login_time=sess.login_time,
            logout_time=sess.logout_time,
            duration_seconds=sess.duration_seconds,
        )
        for sess, user in recent_sessions_q
    ]

    return DashboardStats(
        total_users=total_users,
        total_customers=total_customers,
        total_staff=total_staff,
        total_accounts=total_accounts,
        total_balance=float(total_balance),
        total_transactions=total_transactions,
        recent_transactions=recent_txns_list,
        recent_sessions=recent_sessions,
    )

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
