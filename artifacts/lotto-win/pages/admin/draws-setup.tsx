import React, { useState } from 'react';
import { BackgroundDesignSelector } from '../../../lib/components/BackgroundDesignSelector';
import { BackgroundConfig, BackgroundType } from '../../../lib/types/draw';

export default function DrawSetupPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ticketPrice: '',
    totalTickets: '',
    drawDate: '',
  });
  const [backgroundConfig, setBackgroundConfig] = useState<BackgroundConfig>({
    type: 'natural' as BackgroundType,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBackgroundSelect = (config: BackgroundConfig) => {
    setBackgroundConfig(config);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/draws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          ticketPrice: parseFloat(formData.ticketPrice),
          totalTickets: parseInt(formData.totalTickets),
          drawDate: new Date(formData.drawDate),
          backgroundType: backgroundConfig.type,
          backgroundImageUrl: backgroundConfig.imageUrl,
          customDesignData: backgroundConfig.customDesignData,
        }),
      });

      if (response.ok) {
        setMessage('Draw created successfully!');
        setFormData({
          name: '',
          description: '',
          ticketPrice: '',
          totalTickets: '',
          drawDate: '',
        });
        setBackgroundConfig({ type: 'natural' });
      } else {
        setMessage('Failed to create draw');
      }
    } catch (error) {
      setMessage('Error creating draw');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Create New Draw</h1>
          <p className="text-gray-600">Set up a new lottery draw with custom background design</p>
        </div>

        {/* Background Design Selector */}
        <div className="mb-8">
          <BackgroundDesignSelector
            onBackgroundSelect={handleBackgroundSelect}
            selectedType={backgroundConfig.type}
          />
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-lg p-8 space-y-6"
        >
          {/* Draw Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Draw Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g., Summer Lottery 2024"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter draw description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Ticket Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Price ($) *
              </label>
              <input
                type="number"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleInputChange}
                required
                step="0.01"
                min="0"
                placeholder="10.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Total Tickets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Tickets *
              </label>
              <input
                type="number"
                name="totalTickets"
                value={formData.totalTickets}
                onChange={handleInputChange}
                required
                min="1"
                placeholder="1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Draw Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Draw Date *</label>
            <input
              type="datetime-local"
              name="drawDate"
              value={formData.drawDate}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.includes('success')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Draw'}
          </button>
        </form>
      </div>
    </div>
  );
}
