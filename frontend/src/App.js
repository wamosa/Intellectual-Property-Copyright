import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout components
import Layout from './components/Layout';

// Page components
import Dashboard from './pages/Dashboard';
import ClientProfile from './pages/ClientProfile';
import ClientList from './pages/ClientList';
import MessageCenter from './pages/MessageCenter';
import PaymentManagement from './pages/PaymentManagement';

function App() {
  return (
    <Router>
      <div className="App">
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<ClientList />} />
            <Route path="/clients/:id" element={<ClientProfile />} />
            <Route path="/messages" element={<MessageCenter />} />
            <Route path="/payments" element={<PaymentManagement />} />
          </Routes>
        </Layout>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </Router>
  );
}

export default App;