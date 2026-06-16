import React, { useEffect, useState } from 'react';
import { Polyline } from 'react-leaflet';

interface RoutedPathProps {
  positions: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
  lineCap?: 'butt' | 'round' | 'square' | 'inherit';
}

// Simple cache to prevent redundant API calls
const routeCache = new Map<string, [number, number][]>();

export const RoutedPath: React.FC<RoutedPathProps> = ({ 
  positions, 
  color = '#3b82f6', 
  weight = 4, 
  opacity = 0.8,
  dashArray,
  lineCap = 'round'
}) => {
  // Start with raw positions as fallback
  const [routePositions, setRoutePositions] = useState<[number, number][]>(positions);

  useEffect(() => {
    if (positions.length < 2) {
      setRoutePositions(positions);
      return;
    }

    // Downsample if we have too many waypoints for OSRM (limit is usually around 100)
    const MAX_WAYPOINTS = 80;
    let sampledPositions = positions;
    if (positions.length > MAX_WAYPOINTS) {
      const step = Math.ceil(positions.length / MAX_WAYPOINTS);
      sampledPositions = positions.filter((_, i) => i % step === 0 || i === positions.length - 1);
    }

    // Create a unique key for caching based on downsampled coordinates
    const coordsStr = sampledPositions.map(p => `${p[1]},${p[0]}`).join(';');
    const cacheKey = coordsStr;

    if (routeCache.has(cacheKey)) {
      setRoutePositions(routeCache.get(cacheKey)!);
      return;
    }

    let isMounted = true;

    const fetchRoute = async () => {
      try {
        // OSRM expects: longitude,latitude
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch route');
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          // GeoJSON coordinates are [longitude, latitude]
          const coordinates = data.routes[0].geometry.coordinates as [number, number][];
          // Convert to Leaflet format [latitude, longitude]
          const leafletPositions: [number, number][] = coordinates.map(c => [c[1], c[0]]);
          
          if (isMounted) {
            setRoutePositions(leafletPositions);
            routeCache.set(cacheKey, leafletPositions);
            
            // Limit cache size to prevent memory leaks
            if (routeCache.size > 100) {
              const firstKey = routeCache.keys().next().value;
              if (firstKey) routeCache.delete(firstKey);
            }
          }
        }
      } catch (err) {
        console.warn('OSRM Routing failed, falling back to straight lines:', err);
        if (isMounted) {
          setRoutePositions(positions);
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [positions]);

  return (
    <Polyline 
      positions={routePositions} 
      pathOptions={{ color, weight, opacity, dashArray, lineCap }} 
    />
  );
}

export default RoutedPath;
