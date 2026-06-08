import React, { useState, useEffect } from 'react';
import { LiveDrawCarousel } from '../../lib/components/LiveDrawCarousel';
import { Draw } from '../../lib/types/draw';

export default function DrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);

  useEffect(() => {
    fetchDraws();
  }, []);

  const fetchDraws = async () => {
    try {
      const response = await fetch('/api/draws/live');
      const data = await response.json();
      setDraws(data);
      if (data.length > 0) {
        setSelectedDraw(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch draws:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading draws...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎰 Draw Live Now</h1>
          <p className="text-gray-600">Swipe left or right to see more draws</p>
        </div>

        {/* Carousel */}
        <div className="mb-8">
          {draws.length > 0 ? (
            <LiveDrawCarousel draws={draws} onDrawSelect={setSelectedDraw} />
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 text-lg">No live draws available</p>
            </div>
          )}
        </div>

        {/* Draw Details */}
        {selectedDraw && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{selectedDraw.name}</h2>
            <p className="text-gray-600 mb-6">{selectedDraw.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p className="font-semibold text-gray-800">
                  {selectedDraw.status.charAt(0).toUpperCase() + selectedDraw.status.slice(1)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Ticket Price</p>
                <p className="font-semibold text-gray-800">${selectedDraw.ticketPrice}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Tickets</p>
                <p className="font-semibold text-gray-800">{selectedDraw.totalTickets}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Draw Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(selectedDraw.drawDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Buy Tickets Button */}
            <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors">
              Buy Tickets Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
