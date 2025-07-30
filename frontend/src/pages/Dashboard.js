import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { dashboardApi, clientApi, messageApi } from '../utils/api';
import { toast } from 'react-toastify';
import RiskCard from '../components/RiskCard';
import LoadingSpinner from '../components/LoadingSpinner';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [highRiskClients, setHighRiskClients] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, highRiskResponse, messagesResponse] = await Promise.all([
        dashboardApi.getDashboardStats(),
        clientApi.getHighRiskClients(70),
        messageApi.getMessages({ limit: 5, sortBy: 'timestamp', sortOrder: 'desc' })
      ]);

      setStats(dashboardResponse.data.data);
      setHighRiskClients(highRiskResponse.data.data);
      setRecentMessages(messagesResponse.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (clientId) => {
    try {
      await messageApi.sendAutomatedReminder(clientId);
      toast.success('Reminder sent successfully');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      toast.error('Failed to send reminder');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  // Chart data
  const riskDistributionData = {
    labels: ['Minimal', 'Low', 'Medium', 'High', 'Critical'],
    datasets: [
      {
        data: [
          stats.riskDistribution.minimal || 0,
          stats.riskDistribution.low || 0,
          stats.riskDistribution.medium || 0,
          stats.riskDistribution.high || 0,
          stats.riskDistribution.critical || 0,
        ],
        backgroundColor: [
          '#3B82F6', // blue
          '#10B981', // green
          '#F59E0B', // yellow
          '#F97316', // orange
          '#EF4444', // red
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your debt recovery operations</p>
        </div>
        <button
          onClick={() => dashboardApi.updateAllRiskScores()}
          className="btn btn-primary"
        >
          <ArrowTrendingUpIcon className="h-4 w-4 mr-2" />
          Update Risk Scores
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.overview.totalClients}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-danger-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">High Risk Clients</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.overview.highRiskClients}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Outstanding</dt>
                <dd className="text-lg font-medium text-gray-900">
                  ${stats.overview.totalOutstanding.toLocaleString()}
                </dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-warning-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Overdue Payments</dt>
                <dd className="text-lg font-medium text-gray-900">{stats.overview.overduePayments}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and High Risk Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Distribution</h3>
          <div className="h-64">
            <Doughnut data={riskDistributionData} options={chartOptions} />
          </div>
        </div>

        {/* High Risk Clients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">High Risk Clients</h3>
            <Link to="/clients?riskLevel=critical" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {highRiskClients.slice(0, 5).map((client) => (
              <div key={client._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`risk-indicator risk-${client.riskLevel.level}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">${client.outstandingBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`badge badge-${client.riskLevel.level}`}>
                    {client.riskScore}
                  </span>
                  <Link to={`/clients/${client._id}`} className="text-gray-400 hover:text-gray-600">
                    <EyeIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleSendReminder(client._id)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {highRiskClients.length === 0 && (
              <p className="text-gray-500 text-center py-4">No high-risk clients found</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Messages</h3>
            <Link to="/messages" className="text-sm text-primary-600 hover:text-primary-700">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentMessages.map((message) => (
              <div key={message._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {message.client?.name || 'Unknown Client'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {message.messageType} via {message.channel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge ${
                    message.status === 'sent' ? 'badge-low' :
                    message.status === 'delivered' ? 'badge-minimal' :
                    message.status === 'failed' ? 'badge-critical' :
                    'badge-medium'
                  }`}>
                    {message.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentMessages.length === 0 && (
              <p className="text-gray-500 text-center py-4">No recent messages</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to="/clients"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UsersIcon className="h-5 w-5 text-primary-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Manage Clients</p>
                <p className="text-xs text-gray-500">View and edit client information</p>
              </div>
            </Link>
            
            <Link
              to="/messages"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Send Messages</p>
                <p className="text-xs text-gray-500">Send reminders and follow-ups</p>
              </div>
            </Link>
            
            <Link
              to="/payments"
              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CurrencyDollarIcon className="h-5 w-5 text-primary-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Track Payments</p>
                <p className="text-xs text-gray-500">Monitor payment status and history</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}