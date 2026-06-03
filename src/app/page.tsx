"use client";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-dark">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Lotto Win</h1>
        <p className="text-gray-400 mb-8">Complete lottery platform with all features</p>
        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-4">🎟️ Features Included:</h2>
          <ul className="space-y-2 text-gray-300">
            <li>✅ User Registration & Login (Phone-based)</li>
            <li>✅ Wallet System with Balance Management</li>
            <li>✅ Live Lottery Draws</li>
            <li>✅ Ticket Purchase System</li>
            <li>✅ Deposit/Payment Management (bKash, Nagad, Rocket)</li>
            <li>✅ Admin Control Panel</li>
            <li>✅ Fraud Detection System</li>
            <li>✅ Winner Selection Algorithm</li>
          </ul>
        </div>
      </div>
    </div>
  );
}