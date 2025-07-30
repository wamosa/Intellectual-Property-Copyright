import React from 'react';
import { Link } from 'react-router-dom';
import { 
  EyeIcon, 
  PaperAirplaneIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

export default function RiskCard({ client, onSendReminder, showActions = true }) {
  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'high': return 'border-orange-200 bg-orange-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <EnvelopeIcon className="h-4 w-4" />;
      case 'sms': return <PhoneIcon className="h-4 w-4" />;
      case 'whatsapp': return <ChatBubbleLeftRightIcon className="h-4 w-4" />;
      default: return <EnvelopeIcon className="h-4 w-4" />;
    }
  };

  const formatLastContacted = (date) => {
    if (!date) return 'Never';
    const daysSince = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return 'Yesterday';
    return `${daysSince} days ago`;
  };

  return (
    <div className={`card ${getRiskColor(client.riskLevel?.level)} border-l-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
            <span className={`badge badge-${client.riskLevel?.level || 'minimal'}`}>
              {client.riskScore || 0}
            </span>
          </div>
          
          <div className="space-y-1 text-sm text-gray-600">
            <p>📧 {client.email}</p>
            <p>📱 {client.phone}</p>
            <p>💰 ${client.outstandingBalance?.toLocaleString() || '0'}</p>
            <p>📅 Last contacted: {formatLastContacted(client.lastContacted)}</p>
          </div>
          
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-xs text-gray-500">Preferred:</span>
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              {getChannelIcon(client.preferredChannel)}
              <span className="capitalize">{client.preferredChannel}</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              client.status === 'active' ? 'bg-green-100 text-green-800' :
              client.status === 'delinquent' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {client.status}
            </span>
          </div>
        </div>
        
        {showActions && (
          <div className="flex flex-col space-y-2 ml-4">
            <Link
              to={`/clients/${client._id}`}
              className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
              title="View Details"
            >
              <EyeIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={() => onSendReminder && onSendReminder(client._id)}
              className="flex items-center justify-center p-2 text-primary-600 hover:text-primary-700 hover:bg-white rounded-md transition-colors"
              title="Send Reminder"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {/* Risk factors indicator */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Risk Level: {client.riskLevel?.level || 'minimal'}</span>
          <span>Score: {client.riskScore || 0}/100</span>
        </div>
        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              client.riskLevel?.level === 'critical' ? 'bg-red-500' :
              client.riskLevel?.level === 'high' ? 'bg-orange-500' :
              client.riskLevel?.level === 'medium' ? 'bg-yellow-500' :
              client.riskLevel?.level === 'low' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${Math.min(client.riskScore || 0, 100)}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}