from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from models import User, Customer, Account, Transaction, UserRole, TransactionType, AccountStatus
from schemas import CreateCustomerRequest, DepositWithdrawRequest, TransferRequest
from auth import get_password_hash
import random
import string

def generate_account_number() -> str:
    return ''.join(random.choices(string.digits, k=12))

def create_customer_with_account(db: Session, customer_data: CreateCustomerRequest, created_by_user_id: int = None):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == customer_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create user
    db_user = User(
        name=customer_data.name,
        email=customer_data.email,
        password_hash=get_password_hash(customer_data.password),
        role=UserRole.CUSTOMER,
        is_active=1,
        created_by_id=created_by_user_id
    )
    db.add(db_user)
    db.flush()
    
    # Create customer
    db_customer = Customer(
        user_id=db_user.id,
        phone=customer_data.phone,
        address=customer_data.address
    )
    db.add(db_customer)
    db.flush()
    
    # Create account
    account_number = generate_account_number()
    # Ensure account number is unique
    while db.query(Account).filter(Account.account_number == account_number).first():
        account_number = generate_account_number()
    
    db_account = Account(
        customer_id=db_customer.id,
        account_number=account_number,
        balance=customer_data.initial_balance,
        account_type=customer_data.account_type,
        status=AccountStatus.ACTIVE
    )
    db.add(db_account)
    
    # Create initial deposit transaction if amount > 0
    if customer_data.initial_balance > 0:
        db_transaction = Transaction(
            from_account_id=None,
            to_account_id=db_account.id,
            amount=customer_data.initial_balance,
            transaction_type=TransactionType.DEPOSIT,
            description="Initial deposit"
        )
        db.add(db_transaction)
    
    db.commit()
    db.refresh(db_user)
    db.refresh(db_customer)
    db.refresh(db_account)
    
    return db_user, db_customer, db_account

def deposit_money(db: Session, deposit_data: DepositWithdrawRequest):
    account = db.query(Account).filter(Account.id == deposit_data.account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not active"
        )
    
    if deposit_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than 0"
        )
    
    try:
        # Update balance
        account.balance += deposit_data.amount
        
        # Create transaction record
        db_transaction = Transaction(
            from_account_id=None,
            to_account_id=account.id,
            amount=deposit_data.amount,
            transaction_type=TransactionType.DEPOSIT,
            description=deposit_data.description or "Deposit"
        )
        db.add(db_transaction)
        db.commit()
        db.refresh(account)
        db.refresh(db_transaction)
        
        return account, db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed: {str(e)}"
        )

def withdraw_money(db: Session, withdraw_data: DepositWithdrawRequest):
    account = db.query(Account).filter(Account.id == withdraw_data.account_id).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is not active"
        )
    
    if withdraw_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than 0"
        )
    
    if account.balance < withdraw_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    try:
        # Update balance
        account.balance -= withdraw_data.amount
        
        # Create transaction record
        db_transaction = Transaction(
            from_account_id=account.id,
            to_account_id=None,
            amount=withdraw_data.amount,
            transaction_type=TransactionType.WITHDRAW,
            description=withdraw_data.description or "Withdrawal"
        )
        db.add(db_transaction)
        db.commit()
        db.refresh(account)
        db.refresh(db_transaction)
        
        return account, db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transaction failed: {str(e)}"
        )

def transfer_money(db: Session, transfer_data: TransferRequest):
    from_account = db.query(Account).filter(Account.id == transfer_data.from_account_id).first()
    to_account = db.query(Account).filter(Account.account_number == transfer_data.to_account_number).first()
    
    if not from_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source account not found"
        )
    
    if not to_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination account not found"
        )
    
    if from_account.id == to_account.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same account"
        )
    
    if from_account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source account is not active"
        )
    
    if to_account.status != AccountStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Destination account is not active"
        )
    
    if transfer_data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be greater than 0"
        )
    
    if from_account.balance < transfer_data.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    try:
        # Atomic transaction: debit and credit
        from_account.balance -= transfer_data.amount
        to_account.balance += transfer_data.amount
        
        # Create transaction record
        db_transaction = Transaction(
            from_account_id=from_account.id,
            to_account_id=to_account.id,
            amount=transfer_data.amount,
            transaction_type=TransactionType.TRANSFER,
            description=transfer_data.description or f"Transfer to {to_account.account_number}"
        )
        db.add(db_transaction)
        db.commit()
        db.refresh(from_account)
        db.refresh(to_account)
        db.refresh(db_transaction)
        
        return from_account, to_account, db_transaction
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transfer failed: {str(e)}"
        )
