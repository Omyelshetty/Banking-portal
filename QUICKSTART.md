# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Python 3.8+ installed
- ✅ Node.js 16+ installed
- ✅ MySQL 8.0+ installed and running
- ✅ MySQL root password (or create a new MySQL user)

## Step-by-Step Setup (5 minutes)

### 1. Database Setup (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE banking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 2. Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Create virtual environment (Mac/Linux)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (replace 'password' with your MySQL password)
echo DATABASE_URL=mysql+pymysql://root:password@localhost:3306/banking_db > .env
echo SECRET_KEY=your-secret-key-change-in-production-min-32-chars-required >> .env

# Initialize database and create admin user
python init_db.py

# Start backend server
uvicorn main:app --reload --port 8000
```

Backend will run at: http://localhost:8000

### 3. Frontend Setup (1 minute)

```bash
# Open a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start frontend server
npm run dev
```

Frontend will run at: http://localhost:5173

## Test Login

Open http://localhost:5173 and login with:

**Admin:**
- Email: `admin@bank.com`
- Password: `admin123`

**Staff:**
- Email: `staff@bank.com`
- Password: `staff123`

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'xxx'"
**Solution:** Make sure virtual environment is activated and run `pip install -r requirements.txt`

### Issue: "Can't connect to MySQL"
**Solution:** 
- Check MySQL is running: `mysql -u root -p`
- Verify DATABASE_URL in `.env` file
- Check MySQL credentials

### Issue: "Port 8000 already in use"
**Solution:** 
- Change port: `uvicorn main:app --reload --port 8001`
- Or kill the process using port 8000

### Issue: "npm install fails"
**Solution:**
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run `npm install` again

### Issue: "Frontend can't connect to backend"
**Solution:**
- Verify backend is running on port 8000
- Check browser console for CORS errors
- Verify proxy settings in `vite.config.js`

## Next Steps

1. Login as Admin → Create Staff users
2. Login as Staff → Create Customer accounts
3. Login as Customer → View accounts and transfer money

Enjoy your banking portal! 🏦
