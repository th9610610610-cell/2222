import React, { useState, useEffect } from 'react';
import { AdSlotDisplay } from '../../../lib/components/AdSlotDisplay';
import { AdSlot, AdMediaType } from '../../../lib/types/ads';
import { Trash2, Edit2, Plus } from 'lucide-react';

export default function AdManagementPage() {
  const [ads, setAds] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    mediaType: 'image' as AdMediaType,
    title: '',
    description: '',
    mediaUrl: '',
    textContent: '',
    callToActionUrl: '',
    displayDuration: '5',
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const response = await fetch('/api/ads');
      const data = await response.json();
      setAds(data);
    } catch (error) {
      console.error('Failed to fetch ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: formData.mediaType,
          title: formData.title,
          description: formData.description,
          mediaUrl: formData.mediaUrl || undefined,
          textContent: formData.textContent || undefined,
          callToActionUrl: formData.callToActionUrl || undefined,
          displayDuration: parseInt(formData.displayDuration),
        }),
      });

      if (response.ok) {
        fetchAds();
        setShowForm(false);
        setFormData({
          mediaType: 'image',
          title: '',
          description: '',
          mediaUrl: '',
          textContent: '',
          callToActionUrl: '',
          displayDuration: '5',
        });
      }
    } catch (error) {
      console.error('Failed to create ad:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600">Loading ads...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Advertisement Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Ad
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Advertisement</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Media Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Media Type *</label>
                <select
                  name="mediaType"
                  value={formData.mediaType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Media URL or Text Content */}
              {formData.mediaType !== 'text' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media URL *
                  </label>
                  <input
                    type="url"
                    name="mediaUrl"
                    value={formData.mediaUrl}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text Content *
                  </label>
                  <textarea
                    name="textContent"
                    value={formData.textContent}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* CTA URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call to Action URL
                </label>
                <input
                  type="url"
                  name="callToActionUrl"
                  value={formData.callToActionUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Display Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Duration (seconds) *
                </label>
                <input
                  type="number"
                  name="displayDuration"
                  value={formData.displayDuration}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Create Advertisement
              </button>
            </form>
          </div>
        )}

        {/* Preview */}
        {ads.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Ad Preview</h2>
            <AdSlotDisplay ads={ads.filter((a) => a.isActive)} autoRotate={true} showMotionEffect={true} />
          </div>
        )}

        {/* Ads List */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">All Advertisements</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{ad.title}</td>
                    <td className="px-4 py-3 text-gray-800 capitalize">{ad.mediaType}</td>
                    <td className="px-4 py-3 text-gray-800">{ad.displayDuration}s</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          ad.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {ad.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100 text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-100 text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
