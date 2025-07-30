import React from 'react';

export default function MessageCenter() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message Center</h1>
          <p className="text-gray-600">Send and manage client communications</p>
        </div>
        <button className="btn btn-primary">Compose Message</button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Message History</h3>
            <p className="text-gray-500 text-center py-12">
              Message history and management interface will be displayed here.
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Message Composer</h3>
            <p className="text-gray-500 text-center py-8">
              AI-powered message composition tool will be here.
            </p>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Templates</h3>
            <div className="space-y-2">
              <button className="btn btn-outline w-full text-left">Payment Reminder</button>
              <button className="btn btn-outline w-full text-left">Follow-up</button>
              <button className="btn btn-outline w-full text-left">Final Notice</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}