import React from 'react';

export default function PaymentManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Track and manage client payments</p>
        </div>
        <button className="btn btn-primary">Record Payment</button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Total Outstanding</h3>
          <p className="text-2xl font-bold text-gray-900">$0</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Overdue Payments</h3>
          <p className="text-2xl font-bold text-red-600">0</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">This Month</h3>
          <p className="text-2xl font-bold text-green-600">$0</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
          <p className="text-2xl font-bold text-blue-600">0%</p>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
        <p className="text-gray-500 text-center py-12">
          Payment tracking and management interface will be displayed here.
          <br />
          This will include payment history, overdue tracking, and payment recording.
        </p>
      </div>
    </div>
  );
}