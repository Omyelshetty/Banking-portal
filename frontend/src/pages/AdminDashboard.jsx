import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState(null)
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [createStaffForm, setCreateStaffForm] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [showCreateStaff, setShowCreateStaff] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    fetchUsers()
    fetchTransactions()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard')
      setDashboardStats(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users')
      setUsers(response.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/admin/transactions?limit=50')
      setTransactions(response.data)
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    }
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post('/admin/staff', createStaffForm)
      setSuccess('Staff created successfully!')
      setCreateStaffForm({ name: '', email: '', password: '' })
      setShowCreateStaff(false)
      fetchUsers()
      fetchDashboardData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create staff')
    }
  }

  const handleToggleUserStatus = async (userId, currentStatus) => {
    setError('')
    setSuccess('')

    try {
      await api.put('/admin/users/status', {
        user_id: userId,
        is_active: currentStatus === 1 ? 0 : 1
      })
      setSuccess(`User ${currentStatus === 1 ? 'blocked' : 'activated'} successfully!`)
      fetchUsers()
      fetchDashboardData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  const chartData = dashboardStats ? [
    { name: 'Customers', value: dashboardStats.total_customers },
    { name: 'Staff', value: dashboardStats.total_staff },
    { name: 'Accounts', value: dashboardStats.total_accounts },
    { name: 'Transactions', value: dashboardStats.total_transactions }
  ] : []

  const balanceData = dashboardStats ? [
    { name: 'Total Balance', value: dashboardStats.total_balance }
  ] : []

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
          <button
            onClick={() => setShowCreateStaff(!showCreateStaff)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            {showCreateStaff ? 'Cancel' : 'Create Staff'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {showCreateStaff && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Create New Staff</h3>
            <form onSubmit={handleCreateStaff} className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={createStaffForm.name}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={createStaffForm.email}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={createStaffForm.password}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="col-span-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Statistics Cards */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-blue-600">{dashboardStats.total_users}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Customers</h3>
              <p className="text-3xl font-bold text-green-600">{dashboardStats.total_customers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Accounts</h3>
              <p className="text-3xl font-bold text-purple-600">{dashboardStats.total_accounts}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Balance</h3>
              <p className="text-3xl font-bold text-yellow-600">
                ${dashboardStats.total_balance.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">System Overview</h3>
            {chartData.length > 0 && (
              <BarChart width={500} height={300} data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">User Distribution</h3>
            {chartData.length > 0 && (
              <PieChart width={500} height={300}>
                <Pie
                  data={chartData}
                  cx={250}
                  cy={150}
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        {dashboardStats && dashboardStats.recent_sessions && dashboardStats.recent_sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Recent User Sessions</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto text-sm">
              {dashboardStats.recent_sessions.map((session) => (
                <div key={session.id} className="border-b border-gray-200 pb-2 flex justify-between">
                  <div>
                    <p className="font-semibold">{session.user_name}</p>
                    <p className="text-xs text-gray-500">
                      Login: {new Date(session.login_time).toLocaleString()}
                    </p>
                    {session.logout_time && (
                      <p className="text-xs text-gray-500">
                        Logout: {new Date(session.logout_time).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      Session duration:{' '}
                      {session.duration_seconds
                        ? `${Math.round(session.duration_seconds / 60)} min`
                        : 'Active'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Management */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">All Users</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-gray-500 text-sm">No users found</p>
              ) : (
                users.map(user => (
                  <div key={user.id} className="border rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        user.is_active === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active === 1 ? 'Active' : 'Blocked'}
                      </span>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          className={`text-xs px-3 py-1 rounded transition ${
                            user.is_active === 1
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {user.is_active === 1 ? 'Block' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm">No transactions found</p>
              ) : (
                transactions.map(txn => (
                  <div key={txn.id} className="border-b border-gray-200 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium capitalize">{txn.transaction_type}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.timestamp).toLocaleString()}
                        </p>
                        {txn.from_account_number && (
                          <p className="text-xs text-gray-600">From: {txn.from_account_number}</p>
                        )}
                        {txn.to_account_number && (
                          <p className="text-xs text-gray-600">To: {txn.to_account_number}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          txn.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${txn.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
