import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different categories
const createCategoryIcon = (category, priority) => {
  const colors = {
    roads: '#EF4444',
    utilities: '#F59E0B',
    environment: '#10B981',
    safety: '#8B5CF6',
    parks: '#06B6D4',
    other: '#6B7280',
  };

  const prioritySize = {
    urgent: 30,
    high: 25,
    medium: 20,
    low: 15,
  };

  const color = colors[category] || colors.other;
  const size = prioritySize[priority] || prioritySize.medium;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.4}px;
        color: white;
        font-weight: bold;
      ">
        ${getIconForCategory(category)}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const getIconForCategory = (category) => {
  const icons = {
    roads: '🛣️',
    utilities: '⚡',
    environment: '🌱',
    safety: '🚨',
    parks: '🌳',
    other: '📍',
  };
  return icons[category] || icons.other;
};

// Component to fit map bounds to markers
function MapBounds({ issues }) {
  const map = useMap();

  useEffect(() => {
    if (issues.length > 0) {
      const validIssues = issues.filter(issue => 
        issue.latitude && issue.longitude &&
        !isNaN(parseFloat(issue.latitude)) && 
        !isNaN(parseFloat(issue.longitude))
      );

      if (validIssues.length > 0) {
        const bounds = L.latLngBounds(
          validIssues.map(issue => [
            parseFloat(issue.latitude),
            parseFloat(issue.longitude)
          ])
        );
        
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [issues, map]);

  return null;
}

export default function IssueMap({ issues, selectedCategory, onIssueSelect }) {
  // Filter issues based on selected category
  const filteredIssues = selectedCategory === 'all' 
    ? issues 
    : issues.filter(issue => issue.category === selectedCategory);

  // Filter out issues without valid coordinates
  const validIssues = filteredIssues.filter(issue => 
    issue.latitude && 
    issue.longitude && 
    !isNaN(parseFloat(issue.latitude)) && 
    !isNaN(parseFloat(issue.longitude))
  );

  // Default center (can be adjusted based on your city)
  const defaultCenter = [19.0760, 72.8777]; // Mumbai coordinates
  const defaultZoom = 12;

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      acknowledged: '#3B82F6',
      in_progress: '#1E40AF',
      resolved: '#10B981',
    };
    return colors[status] || '#6B7280';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (validIssues.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: '12px',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '48px', color: '#9CA3AF' }}>🗺️</div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#6B7280' }}>
          No issues with location data
        </div>
        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
          Issues need GPS coordinates to appear on the map
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <MapBounds issues={validIssues} />
      
      {validIssues.map((issue) => (
        <Marker
          key={issue.id}
          position={[parseFloat(issue.latitude), parseFloat(issue.longitude)]}
          icon={createCategoryIcon(issue.category, issue.priority)}
          eventHandlers={{
            click: () => onIssueSelect && onIssueSelect(issue),
          }}
        >
          <Popup>
            <div style={{ minWidth: '200px', maxWidth: '300px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    backgroundColor: colors[issue.category] + '20',
                    color: colors[issue.category],
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                  </span>
                  <span style={{
                    backgroundColor: getStatusColor(issue.status) + '20',
                    color: getStatusColor(issue.status),
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                  </span>
                </div>
              </div>
              
              <h3 style={{ 
                margin: '0 0 8px 0', 
                fontSize: '16px', 
                fontWeight: '700',
                color: '#111827'
              }}>
                {issue.title}
              </h3>
              
              <p style={{ 
                margin: '0 0 8px 0', 
                fontSize: '14px', 
                color: '#6B7280',
                lineHeight: '1.4'
              }}>
                {issue.description.length > 100 
                  ? issue.description.substring(0, 100) + '...'
                  : issue.description
                }
              </p>
              
              {issue.location_name && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '12px' }}>📍</span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    {issue.location_name}
                  </span>
                </div>
              )}
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                color: '#9CA3AF',
                borderTop: '1px solid #F3F4F6',
                paddingTop: '8px'
              }}>
                <span>Reported by {issue.profiles?.full_name || 'Anonymous'}</span>
                <span>{formatDate(issue.created_at)}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// Define colors object for use in popup
const colors = {
  roads: '#EF4444',
  utilities: '#F59E0B',
  environment: '#10B981',
  safety: '#8B5CF6',
  parks: '#06B6D4',
  other: '#6B7280',
};