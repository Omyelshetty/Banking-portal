# Multi-Level Banking Access Portal

A complete, production-ready banking system with role-based access control supporting Admin, Staff, and Customer roles.

## Technology Stack

- **Frontend**: React 18 with Vite
- **Backend**: FastAPI (Python)
- **Database**: MySQL with SQLAlchemy ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Tailwind CSS
- **Charts**: Recharts

## Features

### Authentication
- Secure login/logout with JWT tokens
- Password hashing using bcrypt
- Role-based route protection
- Token expiration handling

### Customer Features
- View account balance(s)
- View transaction history
- Transfer money between accounts
- Download bank statement (PDF/TXT)

### Staff Features
- Create new customers
- Open bank accounts
- Deposit money
- Withdraw money
- View all customers

### Admin Features
- Create staff users
- View all users
- View all transactions
- Block/Activate users
- Dashboard with charts and statistics

## Project Structure

```
Bank APP/
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # JWT authentication
│   ├── services.py          # Business logic
│   ├── pdf_generator.py     # PDF generation
│   ├── init_db.py           # Database initialization
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # Auth context
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Database Schema

### Users Table
- `id` (Primary Key)
- `name`
- `email` (Unique)
- `password_hash`
- `role` (admin/staff/customer)
- `is_active` (1/0)
- `created_at`
- `created_by_id` (Foreign Key to Users)

### Customers Table
- `id` (Primary Key)
- `user_id` (Foreign Key to Users, Unique)
- `phone`
- `address`
- `created_at`

### Accounts Table
- `id` (Primary Key)
- `customer_id` (Foreign Key to Customers)
- `account_number` (Unique, 12 digits)
- `balance`
- `account_type` (savings/checking)
- `status` (active/blocked/closed)
- `created_at`

### Transactions Table
- `id` (Primary Key)
- `from_account_id` (Foreign Key to Accounts, nullable)
- `to_account_id` (Foreign Key to Accounts, nullable)
- `amount`
- `transaction_type` (transfer/deposit/withdraw)
- `timestamp`
- `description`

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- MySQL 8.0 or higher
- pip (Python package manager)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Create a virtual environment (recommended):**
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Create MySQL database:**
```sql
CREATE DATABASE banking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. **Configure database connection:**
   Create a `.env` file in the backend directory:
```env
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/banking_db
SECRET_KEY=your-secret-key-change-in-production-min-32-chars-required
```

   Replace `your_password` with your MySQL root password.

6. **Initialize database and create admin user:**
```bash
python init_db.py
```

   This will create:
   - Database tables
   - Admin user: `admin@bank.com` / `admin123`
   - Staff user: `staff@bank.com` / `staff123`

7. **Start the backend server:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

   The API will be available at `http://localhost:8000`
   API documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

   The frontend will be available at `http://localhost:5173`

## Usage

### Login Credentials

**Admin:**
- Email: `admin@bank.com`
- Password: `admin123`

**Staff:**
- Email: `staff@bank.com`
- Password: `staff123`

**Customer:**
- Create a customer account using the Staff dashboard, then login with those credentials.

### Workflow Examples

#### Admin Workflow:
1. Login as admin
2. Create staff users
3. View all users and transactions
4. Block/activate users
5. View dashboard statistics

#### Staff Workflow:
1. Login as staff
2. Create new customers (this automatically creates a bank account)
3. Select a customer to view their accounts
4. Deposit or withdraw money from customer accounts
5. View all customers

#### Customer Workflow:
1. Login as customer
2. View account balances
3. View transaction history
4. Transfer money to other accounts
5. Download bank statement

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user info

### Customer Endpoints
- `GET /api/customer/accounts` - Get my accounts
- `GET /api/customer/transactions` - Get my transactions
- `POST /api/customer/transfer` - Transfer money
- `GET /api/customer/statement/{account_id}` - Get statement (JSON/PDF)

### Staff Endpoints
- `POST /api/staff/customers` - Create customer
- `GET /api/staff/customers` - Get all customers
- `POST /api/staff/deposit` - Deposit money
- `POST /api/staff/withdraw` - Withdraw money
- `GET /api/staff/accounts/{customer_id}` - Get customer accounts
- `POST /api/staff/accounts` - Open new account

### Admin Endpoints
- `POST /api/admin/staff` - Create staff
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/status` - Update user status
- `GET /api/admin/transactions` - Get all transactions
- `GET /api/admin/dashboard` - Get dashboard stats

## Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control (RBAC)
- SQL injection protection (SQLAlchemy ORM)
- CORS configuration
- Account blocking mechanism
- Transaction atomicity with rollback on failure

## Transaction Logic

- All financial operations are atomic
- Balance checks before withdrawals/transfers
- Automatic transaction record creation
- Rollback on any failure
- Proper debit/credit operations

## Production Considerations

Before deploying to production:

1. **Change SECRET_KEY** in `.env` to a strong random string (minimum 32 characters)
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** for all connections
4. **Configure proper CORS** origins
5. **Set up database backups**
6. **Use a production WSGI server** (e.g., Gunicorn with Uvicorn workers)
7. **Enable rate limiting** on API endpoints
8. **Add logging and monitoring**
9. **Use connection pooling** for database
10. **Implement proper error handling and logging**

## Troubleshooting

### Backend Issues

**Database connection error:**
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database exists

**Import errors:**
- Make sure virtual environment is activated
- Reinstall requirements: `pip install -r requirements.txt`

**Port already in use:**
- Change port in uvicorn command: `--port 8001`

### Frontend Issues

**Cannot connect to backend:**
- Verify backend is running on port 8000
- Check proxy configuration in `vite.config.js`
- Verify CORS settings in backend

**Module not found:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## License

This project is provided as-is for educational and development purposes.

## Support

For issues or questions, please check the code comments or create an issue in the repository.
