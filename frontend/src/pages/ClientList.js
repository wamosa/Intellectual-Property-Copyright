import React from 'react';

export default function ClientList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client database and risk assessments</p>
        </div>
        <button className="btn btn-primary">Add Client</button>
      </div>
      
      <div className="card">
        <p className="text-gray-500 text-center py-12">
          Client list functionality will be implemented here.
          <br />
          This will include filtering, sorting, and client management features.
        </p>
      </div>
    </div>
  );
}