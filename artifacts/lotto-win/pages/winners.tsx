import React, { useState, useEffect } from 'react';
import { WinnerPage } from '../../lib/components/WinnerPage';
import { WinnerTicket } from '../../lib/types/winner';

export default function WinnersPageComponent() {
  const [winners, setWinners] = useState<WinnerTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWinners();
  }, []);

  const fetchWinners = async () => {
    try {
      const response = await fetch('/api/winners');
      const data = await response.json();
      setWinners(data);
    } catch (error) {
      console.error('Failed to fetch winners:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading winners...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 py-12">
      <WinnerPage winners={winners} pageSize={20} />
    </div>
  );
}
