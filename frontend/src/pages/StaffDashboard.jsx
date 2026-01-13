import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'

function StaffDashboard() {
    const [customers, setCustomers] = useState([])
    const [pendingCustomers, setPendingCustomers] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState(null)
    const [customerAccounts, setCustomerAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Forms
    const [createCustomerForm, setCreateCustomerForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        account_type: 'savings',
        initial_balance: '0'
    })
    const [depositForm, setDepositForm] = useState({
        account_id: '',
        amount: '',
        description: ''
    })
    const [withdrawForm, setWithdrawForm] = useState({
        account_id: '',
        amount: '',
        description: ''
    })
    const [openAccountForm, setOpenAccountForm] = useState({
        account_type: 'savings',
        initial_balance: '0'
    })
    const [showCreateCustomer, setShowCreateCustomer] = useState(false)
    const [showOpenAccount, setShowOpenAccount] = useState(false)

    useEffect(() => {
        fetchCustomers()
        fetchPendingCustomers()
    }, [])

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/staff/customers')
            setCustomers(response.data)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to fetch customers')
        } finally {
            setLoading(false)
        }
    }

    const fetchPendingCustomers = async () => {
        try {
            const response = await api.get('/staff/customers/pending')
            setPendingCustomers(response.data)
        } catch (err) {
            // ignore for now, error banner will show from other actions if needed
        }
    }

    const handleApproveCustomer = async (userId, approve) => {
        setError('')
        setSuccess('')
        try {
            await api.post('/staff/customers/approve', { user_id: userId, approve })
            setSuccess(approve ? 'Customer approved successfully' : 'Customer rejected and removed')
            fetchPendingCustomers()
            fetchCustomers()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to update customer')
        }
    }

    const fetchCustomerAccounts = async (customerId) => {
        try {
            const response = await api.get(`/staff/accounts/${customerId}`)
            setCustomerAccounts(response.data)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to fetch accounts')
        }
    }

    const handleCreateCustomer = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            await api.post('/staff/customers', {
                ...createCustomerForm,
                initial_balance: parseFloat(createCustomerForm.initial_balance)
            })
            setSuccess('Customer created successfully!')
            setCreateCustomerForm({
                name: '',
                email: '',
                password: '',
                phone: '',
                address: '',
                account_type: 'savings',
                initial_balance: '0'
            })
            setShowCreateCustomer(false)
            fetchCustomers()
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create customer')
        }
    }

    const handleDeposit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            await api.post('/staff/deposit', {
                account_id: parseInt(depositForm.account_id),
                amount: parseFloat(depositForm.amount),
                description: depositForm.description
            })
            setSuccess('Deposit successful!')
            setDepositForm({ account_id: '', amount: '', description: '' })
            if (selectedCustomer) {
                fetchCustomerAccounts(selectedCustomer.id)
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Deposit failed')
        }
    }

    const handleWithdraw = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        try {
            await api.post('/staff/withdraw', {
                account_id: parseInt(withdrawForm.account_id),
                amount: parseFloat(withdrawForm.amount),
                description: withdrawForm.description
            })
            setSuccess('Withdrawal successful!')
            setWithdrawForm({ account_id: '', amount: '', description: '' })
            if (selectedCustomer) {
                fetchCustomerAccounts(selectedCustomer.id)
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Withdrawal failed')
        }
    }

    const handleOpenAccount = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!selectedCustomer) {
            setError('Please select a customer first')
            return
        }

        try {
            await api.post('/staff/accounts', {
                customer_id: selectedCustomer.id,
                account_type: openAccountForm.account_type,
                initial_balance: parseFloat(openAccountForm.initial_balance)
            })
            setSuccess('Account opened successfully!')
            setOpenAccountForm({ account_type: 'savings', initial_balance: '0' })
            setShowOpenAccount(false)
            fetchCustomerAccounts(selectedCustomer.id)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to open account')
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

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">Staff Dashboard</h2>
                    <button
                        onClick={() => setShowCreateCustomer(!showCreateCustomer)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    >
                        {showCreateCustomer ? 'Cancel' : 'Create Customer'}
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

                {pendingCustomers.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-xl font-semibold mb-4">Pending Customer Registrations</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {pendingCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="border rounded-lg p-3 flex justify-between items-center"
                                >
                                    <div>
                                        <p className="font-semibold">{customer.user?.name}</p>
                                        <p className="text-sm text-gray-600">{customer.user?.email}</p>
                                        <p className="text-xs text-gray-500">{customer.phone || 'No phone'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApproveCustomer(customer.user_id, true)}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleApproveCustomer(customer.user_id, false)}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {showCreateCustomer && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-xl font-semibold mb-4">Create New Customer</h3>
                        <form onSubmit={handleCreateCustomer} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={createCustomerForm.name}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={createCustomerForm.email}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    value={createCustomerForm.password}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={createCustomerForm.phone}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={createCustomerForm.address}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                                <select
                                    value={createCustomerForm.account_type}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, account_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="savings">Savings</option>
                                    <option value="checking">Checking</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={createCustomerForm.initial_balance}
                                    onChange={(e) => setCreateCustomerForm({ ...createCustomerForm, initial_balance: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div className="col-span-2">
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                >
                                    Create Customer
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Customers List */}
                    <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
                        <h3 className="text-xl font-semibold mb-4">All Customers</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {customers.length === 0 ? (
                                <p className="text-gray-500 text-sm">No customers found</p>
                            ) : (
                                customers.map(customer => (
                                    <div
                                        key={customer.id}
                                        className={`border rounded-lg p-3 cursor-pointer transition ${selectedCustomer?.id === customer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                            }`}
                                        onClick={() => {
                                            setSelectedCustomer(customer)
                                            fetchCustomerAccounts(customer.id)
                                        }}
                                    >
                                        <p className="font-semibold">{customer.user?.name}</p>
                                        <p className="text-sm text-gray-600">{customer.user?.email}</p>
                                        <p className="text-xs text-gray-500">{customer.phone || 'No phone'}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Customer Accounts and Operations */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedCustomer ? (
                            <>
                                <div className="bg-white rounded-lg shadow p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold">
                                            Accounts - {selectedCustomer.user?.name}
                                        </h3>
                                        <button
                                            onClick={() => setShowOpenAccount(!showOpenAccount)}
                                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                                        >
                                            {showOpenAccount ? 'Cancel' : 'Open New Account'}
                                        </button>
                                    </div>

                                    {showOpenAccount && (
                                        <form onSubmit={handleOpenAccount} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                                                    <select
                                                        value={openAccountForm.account_type}
                                                        onChange={(e) => setOpenAccountForm({ ...openAccountForm, account_type: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    >
                                                        <option value="savings">Savings</option>
                                                        <option value="checking">Checking</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={openAccountForm.initial_balance}
                                                        onChange={(e) => setOpenAccountForm({ ...openAccountForm, initial_balance: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <button
                                                        type="submit"
                                                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                                                    >
                                                        Open Account
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    {customerAccounts.length === 0 ? (
                                        <p className="text-gray-500">No accounts found</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {customerAccounts.map(account => (
                                                <div key={account.id} className="border rounded-lg p-4">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="font-semibold">Account: {account.account_number}</p>
                                                            <p className="text-sm text-gray-600 capitalize">{account.account_type}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold text-green-600">
                                                                ${account.balance.toFixed(2)}
                                                            </p>
                                                            <p className="text-xs text-gray-500 capitalize">{account.status}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Deposit Form */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-xl font-semibold mb-4">Deposit Money</h3>
                                    <form onSubmit={handleDeposit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Select Account
                                            </label>
                                            <select
                                                required
                                                value={depositForm.account_id}
                                                onChange={(e) => setDepositForm({ ...depositForm, account_id: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Select account</option>
                                                {customerAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.account_number} - ${acc.balance.toFixed(2)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                value={depositForm.amount}
                                                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={depositForm.description}
                                                onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                                        >
                                            Deposit
                                        </button>
                                    </form>
                                </div>

                                {/* Withdraw Form */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-xl font-semibold mb-4">Withdraw Money</h3>
                                    <form onSubmit={handleWithdraw} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Select Account
                                            </label>
                                            <select
                                                required
                                                value={withdrawForm.account_id}
                                                onChange={(e) => setWithdrawForm({ ...withdrawForm, account_id: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Select account</option>
                                                {customerAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.account_number} - ${acc.balance.toFixed(2)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                required
                                                value={withdrawForm.amount}
                                                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={withdrawForm.description}
                                                onChange={(e) => setWithdrawForm({ ...withdrawForm, description: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                                        >
                                            Withdraw
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                                Select a customer to view accounts and perform operations
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default StaffDashboard
