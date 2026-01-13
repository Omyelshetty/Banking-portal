import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import api from '../services/api'

function CustomerDashboard() {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_number: '',
    amount: '',
    description: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchAccounts()
    fetchTransactions()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/customer/accounts')
      setAccounts(response.data)
      if (response.data.length > 0 && !selectedAccount) {
        setSelectedAccount(response.data[0].id)
        setTransferForm({ ...transferForm, from_account_id: response.data[0].id })
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/customer/transactions?limit=20')
      setTransactions(response.data)
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await api.post('/customer/transfer', {
        ...transferForm,
        amount: parseFloat(transferForm.amount)
      })
      setSuccess('Transfer successful!')
      setTransferForm({
        ...transferForm,
        to_account_number: '',
        amount: '',
        description: ''
      })
      fetchAccounts()
      fetchTransactions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Transfer failed')
    }
  }

  const downloadStatement = async (accountId, format = 'pdf') => {
    try {
      const response = await api.get(`/customer/statement/${accountId}?format=${format}`, {
        responseType: format === 'pdf' ? 'blob' : 'json'
      })
      
      if (format === 'pdf') {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = `statement_${accountId}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        // JSON format fallback - create text file
        const data = response.data
        let content = `Bank Statement\n`
        content += `Account Number: ${data.account.account_number}\n`
        content += `Balance: $${data.account.balance.toFixed(2)}\n`
        content += `Account Type: ${data.account.account_type}\n\n`
        content += `Transactions:\n`
        content += `Date\t\tType\t\tAmount\t\tDescription\n`
        content += `-`.repeat(80) + `\n`
        
        data.transactions.forEach(txn => {
          const date = new Date(txn.timestamp).toLocaleDateString()
          const type = txn.transaction_type
          const amount = txn.amount.toFixed(2)
          const desc = txn.description || ''
          content += `${date}\t${type}\t$${amount}\t${desc}\n`
        })
        
        const blob = new Blob([content], { type: 'text/plain' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `statement_${data.account.account_number}.txt`
        a.click()
        window.URL.revokeObjectURL(url)
      }
      setSuccess('Statement downloaded successfully!')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate statement')
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

  const currentAccount = accounts.find(acc => acc.id === selectedAccount)

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Customer Dashboard</h2>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">My Accounts</h3>
              {accounts.length === 0 ? (
                <p className="text-gray-500">No accounts found</p>
              ) : (
                <div className="space-y-4">
                  {accounts.map(account => (
                    <div
                      key={account.id}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedAccount === account.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => {
                        setSelectedAccount(account.id)
                        setTransferForm({ ...transferForm, from_account_id: account.id })
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Account: {account.account_number}</p>
                          <p className="text-sm text-gray-600">{account.account_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${account.balance.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{account.status}</p>
                        </div>
                      </div>
                      <div className="mt-2 space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadStatement(account.id, 'pdf')
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Download PDF
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadStatement(account.id, 'json')
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Download TXT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transfer Money */}
            {currentAccount && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-4">Transfer Money</h3>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From Account
                    </label>
                    <input
                      type="text"
                      value={currentAccount.account_number}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To Account Number
                    </label>
                    <input
                      type="text"
                      required
                      value={transferForm.to_account_number}
                      onChange={(e) => setTransferForm({ ...transferForm, to_account_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={transferForm.description}
                      onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Transaction description"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                  >
                    Transfer
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Recent Transactions</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-gray-500 text-sm">No transactions yet</p>
              ) : (
                transactions.map(txn => (
                  <div key={txn.id} className="border-b border-gray-200 pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium capitalize">{txn.transaction_type}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.timestamp).toLocaleString()}
                        </p>
                        {txn.description && (
                          <p className="text-xs text-gray-600 mt-1">{txn.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          txn.transaction_type === 'deposit' || (txn.transaction_type === 'transfer' && txn.to_account_id) ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {txn.transaction_type === 'deposit' || (txn.transaction_type === 'transfer' && txn.to_account_id) ? '+' : '-'}${txn.amount.toFixed(2)}
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

export default CustomerDashboard
