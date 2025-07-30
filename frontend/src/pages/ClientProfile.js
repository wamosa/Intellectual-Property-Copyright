import React from 'react';
import { useParams } from 'react-router-dom';

export default function ClientProfile() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Profile</h1>
          <p className="text-gray-600">Detailed client information and risk analysis</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-outline">Edit Client</button>
          <button className="btn btn-primary">Send Message</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Risk History Graph</h3>
            <p className="text-gray-500 text-center py-12">
              Risk history chart will be displayed here for client ID: {id}
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Client Details</h3>
            <p className="text-gray-500">Client information will be shown here</p>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="btn btn-primary w-full">Send Reminder</button>
              <button className="btn btn-outline w-full">Update Risk Score</button>
              <button className="btn btn-outline w-full">Record Payment</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Message Timeline</h3>
        <p className="text-gray-500 text-center py-8">
          Message history timeline will be displayed here
        </p>
      </div>
    </div>
  );
}