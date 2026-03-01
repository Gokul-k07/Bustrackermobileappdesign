import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Bus, Navigation, X, CheckCircle, Edit2, Save, Plus, Trash2, Clock, Compass, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { BusLocation, LocationShare, UserRole, BusStop, RouteMeta } from '../App';
import { apiClient } from '../utils/api';
import { toast } from 'sonner';

interface MapViewProps {
  busLocations: BusLocation[];
  locationShares: LocationShare[];
  currentLocation: { lat: number; lng: number };
  userRole: UserRole;
  userId?: string;
  userLinkedDriverId?: string | null;
  isLocationSharing?: boolean;
  locationPermissionGranted?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

type LatLngTuple = [number, number];

interface OpenRouteServiceGeoJsonResponse {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
  error?: {
    message?: string;
  };
}

const OPENROUTES_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdiMGNkYjk3ZTBhMDQ4MzA4N2MzNTA4YTFlNWFmMjUzIiwiaCI6Im11cm11cjY0In0=';
const OPENROUTES_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMarkerOffset(seed: string) {
  const hash = hashSeed(seed);
  const angle = (hash % 360) * (Math.PI / 180);
  const magnitude = 0.00008 + ((hash % 7) * 0.00001); // ~9m to ~17m
  return {
    lat: Math.sin(angle) * magnitude,
    lng: Math.cos(angle) * magnitude
  };
}

export function MapView({
  busLocations,
  locationShares,
  currentLocation,
  userRole,
  userId,
  userLinkedDriverId,
  isLocationSharing,
  locationPermissionGranted
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const routeLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [routeMeta, setRouteMeta] = useState<RouteMeta | null>(null);
  const [showBusDetails, setShowBusDetails] = useState(false);
  const [showRouteView, setShowRouteView] = useState(false);
  const [editingStops, setEditingStops] = useState(false);
  const [editedStops, setEditedStops] = useState<BusStop[]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  
  // Show all visible buses (online or last-known offline within expiry)
  const visibleBuses = busLocations || [];
  const onlineBuses = visibleBuses.filter((bus) => bus.isOnline);
  const waitingBuses = visibleBuses.filter((bus) => !bus.isOnline);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit',
      year: '2-digit'
    });
  };

  const calculateHeading = (bus: any) => {
    // Calculate heading from previous locations
    if (!bus.previousLocations || bus.previousLocations.length < 2) {
      return 'N/A';
    }
    
    const prev = bus.previousLocations[bus.previousLocations.length - 1];
    const current = { lat: bus.lat, lng: bus.lng };
    
    const deltaLat = current.lat - prev.lat;
    const deltaLng = current.lng - prev.lng;
    
    // Calculate angle in degrees
    let angle = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI);
    angle = (angle + 360) % 360;
    
    // Convert to compass direction
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(angle / 45) % 8;
    
    return directions[index];
  };

  const calculateSpeed = (bus: any) => {
    // Calculate speed from position changes
    if (!bus.previousLocations || bus.previousLocations.length < 2) {
      return 'N/A';
    }
    
    const prev = bus.previousLocations[bus.previousLocations.length - 1];
    const current = { lat: bus.lat, lng: bus.lng, timestamp: bus.lastUpdated };
    
    // Check if bus is moving (position changed)
    const distance = calculateDistance(prev.lat, prev.lng, current.lat, current.lng);
    
    if (distance < 0.0001) { // Less than ~10 meters
      return 'N/A';
    }
    
    // Calculate time difference in hours
    const timeDiff = (new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60);
    
    if (timeDiff === 0) return 'N/A';
    
    // Speed in km/h
    const speed = distance / timeDiff;
    
    return Math.round(speed);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Haversine formula for distance in km
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getTripCount = () => {
    // This would come from backend - trip history count for today
    // For now, return placeholder
    return 1;
  };

  const generateTripTimes = (stops: BusStop[]) => {
    // Generate realistic trip times for each stop
    const now = new Date();
    const baseTime = now.getTime();
    
    return stops.map((stop, index) => {
      const outboundTime = new Date(baseTime + (index * 5 * 60000)); // Every 5 minutes
      const inboundTime = new Date(baseTime + (index * 5 * 60000) + (2 * 60 * 60000)); // 2 hours later
      
      return {
        ...stop,
        outbound: {
          start: outboundTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          end: new Date(outboundTime.getTime() + 3 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        },
        inbound: {
          start: inboundTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          end: new Date(inboundTime.getTime() + 3 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        }
      };
    });
  };

  // Load Leaflet library
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
        document.head.appendChild(link);
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.L) {
      setMapLoaded(true);
    }
  }, []);

  // Initialize map with dark style
  useEffect(() => {
    if (mapLoaded && mapRef.current && !mapInstance.current) {
      const L = window.L;
      
      // Initialize map with worldCopyJump option for looping
      mapInstance.current = L.map(mapRef.current, {
        worldCopyJump: true,
        maxBounds: null,
        maxBoundsViscosity: 0.0,
        zoomControl: false
      }).setView([currentLocation.lat, currentLocation.lng], 13);

      // Add light MapTiler tile layer (white/light theme)
      const API_KEY = "3rn9Pt2DDS2PIVE5bwGb";
      L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${API_KEY}`, {
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a>',
        maxZoom: 18,
        noWrap: false,
      }).addTo(mapInstance.current);

      // Add custom zoom control in top-right
      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstance.current);
      
      // Add button to center on user location
      const centerControl = L.Control.extend({
        onAdd: function() {
          const btn = L.DomUtil.create('button');
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>';
          btn.title = 'Center on my location';
          btn.style.cssText = 'background: white; border: 2px solid rgba(0,0,0,0.2); border-radius: 4px; width: 30px; height: 30px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 5px rgba(0,0,0,0.4);';
          
          btn.onclick = function() {
            mapInstance.current.setView([currentLocation.lat, currentLocation.lng], 15);
          };
          
          return btn;
        }
      });
      
      new centerControl({ position: 'topright' }).addTo(mapInstance.current);
    }
  }, [mapLoaded, currentLocation]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded) return;

    const L = window.L;
    
    // Clear existing markers except route layer
    Object.entries(markersRef.current).forEach(([key, marker]: [string, any]) => {
      if (key !== 'routeLayer') {
        mapInstance.current.removeLayer(marker);
      }
    });
    
    // Keep route layer if exists
    const routeLayer = markersRef.current['routeLayer'];
    markersRef.current = routeLayer ? { routeLayer } : {};

    // Note: Passenger location sharing is handled by showing them in the bus list
    // They will appear as a regular bus marker with their chosen bus name
    // No need to add a separate user location marker

    // Add bus markers (online => vibrant, offline/last-known => faded)
    visibleBuses.forEach((bus) => {
      const isOnlineBus = !!bus.isOnline;
      const busIcon = L.divIcon({
        html: `
          <div style="
            background: ${isOnlineBus ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' : 'linear-gradient(135deg, rgba(167,167,167,0.4) 0%, rgba(200,200,200,0.4) 100%)'};
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 2px solid white;
            box-shadow: 0 4px 12px ${isOnlineBus ? 'rgba(168, 85, 247, 0.6)' : 'rgba(100,100,100,0.2)'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
            opacity: ${isOnlineBus ? '1' : '0.6'};
          ">🚌</div>
        `,
        className: 'custom-marker bus-marker',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const busMarker = L.marker([bus.lat, bus.lng], { icon: busIcon })
        .addTo(mapInstance.current)
        .on('click', () => {
          handleBusClick(bus);
        });

      // Popup: show last seen for offline buses
      if (!isOnlineBus && bus.lastUpdated) {
        busMarker.bindPopup(`<div style="color: #1f2937; font-family: sans-serif;"><b>${bus.route}</b><br/>Last seen: ${formatTime(bus.lastUpdated)}<br/>Status: Last location</div>`)
      }

      markersRef.current[`bus-${bus.id}`] = busMarker;
    });

    // Add passenger markers - show for all users (passengers and drivers)
    locationShares.forEach((share) => {
      const isActiveShare = !!share.active;
      const hasOverlappingBus = visibleBuses.some((bus) =>
        Math.abs(bus.lat - share.lat) < 0.000001 &&
        Math.abs(bus.lng - share.lng) < 0.000001
      );
      const offset = hasOverlappingBus ? getMarkerOffset(share.id) : { lat: 0, lng: 0 };
      const markerLat = share.lat + offset.lat;
      const markerLng = share.lng + offset.lng;
      const passengerIcon = L.divIcon({
        html: `
          <div style="
            background: ${isActiveShare ? 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%)' : 'linear-gradient(135deg, rgba(150,150,150,0.4) 0%, rgba(180,180,180,0.4) 100%)'};
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: 2px solid white;
            box-shadow: 0 4px 12px ${isActiveShare ? 'rgba(6, 182, 212, 0.6)' : 'rgba(100,100,100,0.2)'};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            opacity: ${isActiveShare ? '1' : '0.6'};
          ">🚌</div>
        `,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const popupText = `<div style="color: #1f2937; font-family: sans-serif;"><b>${share.userName}</b><br/>${isActiveShare ? 'Passenger Sharing' : 'Last known location'}<br/>Since: ${formatTime(share.startTime)}</div>`;

      const passengerMarker = L.marker([markerLat, markerLng], { icon: passengerIcon })
        .addTo(mapInstance.current)
        .bindPopup(popupText);

      markersRef.current[`passenger-${share.id}`] = passengerMarker;
    });

  }, [mapLoaded, currentLocation, visibleBuses, locationShares, userRole, isLocationSharing, locationPermissionGranted]);

  const handleBusClick = async (bus: BusLocation) => {
    const isSameBus = selectedBus?.id === bus.id;

    setSelectedBus(bus);
    setShowBusDetails(!isSameBus);
    setShowRouteView(isSameBus);
    setEditingStops(false);
    setNewRouteName('');

    // Always load and draw route on click so users see it immediately on the map.
    try {
      const response = await apiClient.getBusStops(bus.id);
      const route = response.route;
      const stops = route?.stops || response.busStops || bus.busStops || [];
      const routeDriverId = route?.driverId || bus.driverId || bus.id;
      const routeSharedByUserId = route?.sharedByUserId || bus.sharedByUserId || null;
      const editable = userId === routeDriverId;
      const canMarkPassed =
        editable ||
        (!!userLinkedDriverId && userLinkedDriverId === routeDriverId && routeSharedByUserId === userId);

      setRouteMeta({
        routeId: route?.routeId || bus.routeId || bus.id,
        driverId: routeDriverId,
        sharedByUserId: routeSharedByUserId,
        stops,
        passedStops: route?.passedStops || stops.filter((stop: BusStop) => stop.passed).map((stop: BusStop) => stop.id),
        editable,
        canMarkPassed
      });
      setBusStops(stops);
      setEditedStops(stops);
      await drawRoutePath(bus, stops);
    } catch (error) {
      console.error('Failed to load bus stops:', error);
      const fallbackStops = bus.busStops || [];
      const routeDriverId = bus.driverId || bus.id;
      const routeSharedByUserId = bus.sharedByUserId || null;
      const editable = userId === routeDriverId;
      const canMarkPassed =
        editable ||
        (!!userLinkedDriverId && userLinkedDriverId === routeDriverId && routeSharedByUserId === userId);

      setRouteMeta({
        routeId: bus.routeId || bus.id,
        driverId: routeDriverId,
        sharedByUserId: routeSharedByUserId,
        stops: fallbackStops,
        passedStops: fallbackStops.filter((stop: BusStop) => stop.passed).map((stop: BusStop) => stop.id),
        editable,
        canMarkPassed
      });
      setBusStops(fallbackStops);
      setEditedStops(fallbackStops);
      await drawRoutePath(bus, fallbackStops);
    }
  };

  const drawRoutePath = async (bus: BusLocation, stops: BusStop[]) => {
    if (!mapInstance.current || !mapLoaded) return;
    
    const L = window.L;
    
    // Remove existing route layer
    if (routeLayerRef.current) {
      mapInstance.current.removeLayer(routeLayerRef.current);
      delete markersRef.current['routeLayer'];
    }

    if (stops.length === 0) return;

    // Create route layer group
    const routeLayer = L.layerGroup().addTo(mapInstance.current);
    
    const stopCoordinates: Array<{ lat: number; lng: number; stop: BusStop; index: number }> = [];
    
    // Add bus current position as start
    const fallbackRouteCoordinates: LatLngTuple[] = [[bus.lat, bus.lng]];
    
    // Collect all stop coordinates
    stops.forEach((stop, index) => {
      let lat, lng;
      
      const hasValidCoordinates =
        Number.isFinite(stop.lat) &&
        Number.isFinite(stop.lng) &&
        Math.abs(stop.lat) <= 90 &&
        Math.abs(stop.lng) <= 180 &&
        !(stop.lat === 0 && stop.lng === 0);

      if (hasValidCoordinates) {
        lat = stop.lat;
        lng = stop.lng;
      } else {
        const offset = 0.01;
        const angle = (index / stops.length) * Math.PI * 2;
        lat = bus.lat + Math.sin(angle) * offset * (index + 1);
        lng = bus.lng + Math.cos(angle) * offset * (index + 1);
      }
      
      stopCoordinates.push({ lat, lng, stop, index });
      fallbackRouteCoordinates.push([lat, lng]);
    });

    let drawnCoordinates: LatLngTuple[] = fallbackRouteCoordinates;
    let roadRouteRendered = false;

    const waypoints = [[bus.lng, bus.lat], ...stopCoordinates.map((s) => [s.lng, s.lat])];

    // OpenRouteService allows up to 50 coordinates for a directions request.
    if (waypoints.length >= 2 && waypoints.length <= 50) {
      try {
        const response = await fetch(OPENROUTES_DIRECTIONS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': OPENROUTES_API_KEY
          },
          body: JSON.stringify({
            coordinates: waypoints
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage =
            errorData?.error?.message ||
            `OpenRouteService request failed with status ${response.status}`;
          throw new Error(errorMessage);
        }

        const data: OpenRouteServiceGeoJsonResponse = await response.json();
        const roadCoordinatesRaw = data.features?.[0]?.geometry?.coordinates ?? [];
        const roadCoordinates = roadCoordinatesRaw
          .filter((coord): coord is [number, number] =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1])
          )
          .map(([lng, lat]) => [lat, lng] as LatLngTuple);

        if (roadCoordinates.length > 1) {
          drawnCoordinates = roadCoordinates;
          roadRouteRendered = true;

          L.polyline(roadCoordinates, {
            color: '#2563eb',
            weight: 5,
            opacity: 0.9
          }).addTo(routeLayer);
        } else {
          throw new Error('OpenRouteService returned no drivable geometry');
        }
      } catch (error) {
        console.warn('Road routing failed, using straight lines:', error);
      }
    } else {
      console.warn('Too many waypoints for one OpenRouteService request, using fallback line.');
    }

    if (!roadRouteRendered) {
      for (let i = 0; i < fallbackRouteCoordinates.length - 1; i++) {
        const isPassed = stopCoordinates[i - 1]?.stop?.passed || false;
        L.polyline(
          [fallbackRouteCoordinates[i], fallbackRouteCoordinates[i + 1]],
          {
            color: isPassed ? '#9ca3af' : '#3b82f6',
            weight: 5,
            opacity: isPassed ? 0.5 : 0.8
          }
        ).addTo(routeLayer);
      }
    }

    // Add stop markers
    stopCoordinates.forEach(({ lat, lng, stop, index }) => {
      const stopIcon = L.divIcon({
        html: `
          <div style="
            background: ${stop.passed ? '#6b7280' : '#ec4899'};
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
            font-weight: bold;
          ">${index + 1}</div>
        `,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      L.marker([lat, lng], { icon: stopIcon })
        .bindPopup(`<div style="color: #1f2937; font-family: sans-serif;"><b>${stop.name}</b><br/>Stop ${index + 1}<br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</div>`)
        .addTo(routeLayer);
    });

    routeLayerRef.current = routeLayer;
    markersRef.current['routeLayer'] = routeLayer;

    // Fit map to show route
    const bounds = L.latLngBounds(drawnCoordinates);
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleCloseDetails = () => {
    setShowBusDetails(false);
    setShowRouteView(false);
    setSelectedBus(null);
    setRouteMeta(null);
    
    // Remove route layer
    if (routeLayerRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
      delete markersRef.current['routeLayer'];
    }
  };

  const handleStopToggle = async (stopId: string, currentPassed: boolean) => {
    if (!selectedBus || !routeMeta?.canMarkPassed) return;
    
    try {
      await apiClient.updateBusStop(selectedBus.id, stopId, !currentPassed);
      setBusStops(prev => prev.map(stop => 
        stop.id === stopId ? { ...stop, passed: !currentPassed } : stop
      ));
      setEditedStops(prev => prev.map(stop => 
        stop.id === stopId ? { ...stop, passed: !currentPassed } : stop
      ));
      setRouteMeta((prev) => {
        if (!prev) return prev;
        const nextPassedStops = prev.stops
          .map((stop) => stop.id === stopId ? { ...stop, passed: !currentPassed } : stop)
          .filter((stop) => stop.passed)
          .map((stop) => stop.id);
        return { ...prev, passedStops: nextPassedStops };
      });
      toast.success('Route status updated');
    } catch (error) {
      console.error('Failed to update bus stop:', error);
      toast.error('Failed to update route status');
    }
  };

  const handleStopNameChange = (stopId: string, newName: string) => {
    setEditedStops(prev => prev.map(stop => 
      stop.id === stopId ? { ...stop, name: newName } : stop
    ));
  };

  const handleStopLatChange = (stopId: string, newLat: string) => {
    const latValue = parseFloat(newLat);
    if (!isNaN(latValue)) {
      setEditedStops(prev => prev.map(stop => 
        stop.id === stopId ? { ...stop, lat: latValue } : stop
      ));
    }
  };

  const handleStopLngChange = (stopId: string, newLng: string) => {
    const lngValue = parseFloat(newLng);
    if (!isNaN(lngValue)) {
      setEditedStops(prev => prev.map(stop => 
        stop.id === stopId ? { ...stop, lng: lngValue } : stop
      ));
    }
  };

  const handleSaveStops = async () => {
    if (!routeMeta?.editable || !selectedBus) return;
    
    try {
      await apiClient.updateBusStops(selectedBus.id, editedStops);
      setBusStops(editedStops);
      setEditingStops(false);
      toast.success('Routes saved successfully');
    } catch (error) {
      console.error('Failed to save bus stops:', error);
      toast.error('Failed to save routes');
    }
  };

  const handleAddRoute = async () => {
    if (!routeMeta?.editable || !selectedBus || !newRouteName.trim()) {
      toast.error('Please enter a route name');
      return;
    }
    
    try {
      setIsAddingRoute(true);
      const response = await apiClient.addRoute(selectedBus.id, newRouteName.trim());
      const updatedStops = response.busStops || [];
      setBusStops(updatedStops);
      setEditedStops(updatedStops);
      setNewRouteName('');
      toast.success('Route added successfully');
    } catch (error) {
      console.error('Failed to add route:', error);
      toast.error('Failed to add route');
    } finally {
      setIsAddingRoute(false);
    }
  };

  const handleDeleteRoute = (stopId: string) => {
    const updatedStops = editedStops
      .filter(stop => stop.id !== stopId)
      .map((stop, index) => ({ ...stop, order: index + 1 }));
    setEditedStops(updatedStops);
  };

  const canEditBus = !!routeMeta?.editable;
  const canMarkPassed = !!routeMeta?.canMarkPassed;

  const stopsWithTimes = busStops.length > 0 ? generateTripTimes(busStops) : [];

  return (
    <div className="space-y-4">
      {/* Location Permission Reminder */}
      {!locationPermissionGranted && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Location Permission Required</p>
                <p className="text-sm text-yellow-800 mt-1">
                  To see your current location on the map and share it with drivers, please enable location access in your browser or device settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bus Details Header - Shows on first click */}
      {showBusDetails && selectedBus && (
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Bus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedBus.route}</h3>
                  <p className="text-sm text-white/80">Route shown on map. Click again to open full schedule.</p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleCloseDetails}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-white/70 text-xs">Vehicle</p>
                  <p className="font-medium">{selectedBus.route.split('-')[1]}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-white/70 text-xs">Trip</p>
                  <p className="font-medium">{getTripCount()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-white/70 text-xs">Heading</p>
                  <p className="font-medium">{calculateHeading(selectedBus)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-white/70 text-xs">Speed</p>
                  <p className="font-medium">
                    {typeof calculateSpeed(selectedBus) === 'number' 
                      ? `${calculateSpeed(selectedBus)} km/h` 
                      : calculateSpeed(selectedBus)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 col-span-2">
                <Clock className="h-4 w-4 text-white/80" />
                <div>
                  <p className="text-white/70 text-xs">Updated</p>
                  <p className="font-medium">{formatDate(selectedBus.lastUpdated)}, {formatTime(selectedBus.lastUpdated)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Map Container */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          <div 
            ref={mapRef} 
            className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden relative"
            style={{ minHeight: '500px', zIndex: 1 }}
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg z-10">
              <div className="text-center">
                <Bus className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-400">Loading interactive map...</p>
              </div>
            </div>
          )}

          {/* Map Attribution */}
          <div className="absolute bottom-1 right-1 bg-black/70 px-2 py-1 rounded text-xs text-white/70 z-[400] pointer-events-none">
            © MapTiler
          </div>
        </CardContent>
      </Card>

      {/* Route Schedule View - Shows on second click */}
      {showRouteView && selectedBus && (
        <Card>
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" />
                {selectedBus.route}
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleCloseDetails}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Route Schedule - Single list (same for both directions) */}
            <div className="w-full">
              {busStops.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No route stops available</p>
                  {canEditBus && (
                    <Button 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setEditingStops(true)}
                    >
                      Add Routes
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex gap-3 p-4 min-w-max">
                    {stopsWithTimes.map((stop, index) => {
                      const distanceFromStart = index > 0 ? calculateDistance(
                        selectedBus.lat, selectedBus.lng,
                        stop.lat || selectedBus.lat, stop.lng || selectedBus.lng
                      ) : 0;
                      
                      const distanceFromCurrent = currentLocation.lat && currentLocation.lng 
                        ? calculateDistance(
                            currentLocation.lat, currentLocation.lng,
                            stop.lat || selectedBus.lat, stop.lng || selectedBus.lng
                          )
                        : 0;
                      
                      const estimatedTime = (distanceFromCurrent / 30) * 60; // Assuming 30 km/h average
                      
                      return (
                        <Card 
                          key={stop.id}
                          className={`min-w-[200px] ${stop.passed ? 'bg-gray-100' : ''}`}
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant={stop.passed ? "secondary" : "default"}>
                                Stop {index + 1}
                              </Badge>
                              {stop.passed && <CheckCircle className="h-4 w-4 text-gray-400" />}
                            </div>
                            
                            <h4 className={`font-medium ${stop.passed ? 'text-gray-500 line-through' : ''}`}>
                              {stop.name}
                            </h4>
                            
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Start:</span>
                                <span className="font-medium">{stop.outbound.start}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>End:</span>
                                <span className="font-medium">{stop.outbound.end}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1">
                                <span>From Start:</span>
                                <span className="font-medium">{distanceFromStart.toFixed(2)} km</span>
                              </div>
                              <div className="flex justify-between">
                                <span>From You:</span>
                                <span className="font-medium">{distanceFromCurrent.toFixed(2)} km</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Est. Time:</span>
                                <span className="font-medium">{Math.round(estimatedTime)} min</span>
                              </div>
                            </div>
                            
                            {canMarkPassed && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => handleStopToggle(stop.id, stop.passed)}
                              >
                                {stop.passed ? 'Mark Pending' : 'Mark Passed'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Driver Edit Controls */}
            {canEditBus && (
              <div className="p-4 border-t bg-gray-50">
                {editingStops ? (
                  <div className="space-y-3">
                    {editedStops.map((stop, index) => (
                      <div key={stop.id} className="space-y-2 p-3 bg-white rounded-lg border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[30px]">#{index + 1}</span>
                          <Input
                            placeholder="Stop name"
                            value={stop.name}
                            onChange={(e) => handleStopNameChange(stop.id, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteRoute(stop.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-10">
                          <div>
                            <Label className="text-xs text-gray-500">Latitude</Label>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="e.g., 10.3673"
                              value={stop.lat || ''}
                              onChange={(e) => handleStopLatChange(stop.id, e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Longitude</Label>
                            <Input
                              type="number"
                              step="0.000001"
                              placeholder="e.g., 77.9738"
                              value={stop.lng || ''}
                              onChange={(e) => handleStopLngChange(stop.id, e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Input
                        placeholder="Add new stop..."
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddRoute()}
                      />
                      <Button onClick={handleAddRoute} disabled={isAddingRoute}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveStops} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setEditingStops(false);
                          setEditedStops(busStops);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => setEditingStops(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Route Stops
                    </Button>
                    <div className="flex gap-2">
                      {busStops.map((stop) => (
                        <Button
                          key={stop.id}
                          size="sm"
                          variant={stop.passed ? "outline" : "default"}
                          onClick={() => handleStopToggle(stop.id, stop.passed)}
                          className="text-xs"
                        >
                          {stop.name.substring(0, 10)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 font-medium">Map Legend</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow"></div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded border-2 border-white shadow flex items-center justify-center text-xs">🚌</div>
              <span>Buses (Active/Waiting)</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-teal-500 rounded border-2 border-white shadow flex items-center justify-center text-[10px]">🚌</div>
                <span>Passengers Sharing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location List */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 font-medium">
            {'All Locations'}
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            {onlineBuses.length} active buses, {waitingBuses.length} waiting buses, {locationShares.length} passenger shares
          </p>
          <div className="space-y-3">
            {/* Current User Location */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow"></div>
                <span className="font-medium">Your Location</span>
              </div>
              <span className="text-sm text-muted-foreground font-mono">
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </span>
            </div>

            {/* Active + waiting buses */}
            {visibleBuses.map((bus) => (
              <div 
                key={bus.id} 
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  bus.isOnline
                    ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
                onClick={() => handleBusClick(bus)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded border-2 border-white shadow flex items-center justify-center text-xs">🚌</div>
                  <div>
                    <span className="font-medium">{bus.route}</span>
                    <p className="text-xs text-muted-foreground">{bus.driverName} - {bus.isOnline ? 'Active' : 'Waiting'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground font-mono">
                    {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {bus.isOnline ? formatTime(bus.lastUpdated) : `Waiting since ${formatTime(bus.lastUpdated)}`}
                  </p>
                </div>
              </div>
            ))}

            {/* Passenger sharing (visible to all users) */}
            {locationShares.map((share) => (
              <div key={share.id} className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-teal-500 rounded border-2 border-white shadow flex items-center justify-center text-[10px]">🚌</div>
                  <div>
                    <span className="font-medium">{share.userName}</span>
                    <p className="text-xs text-muted-foreground">Passenger Sharing</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground font-mono">
                    {share.lat.toFixed(4)}, {share.lng.toFixed(4)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Since {formatTime(share.startTime)}
                  </p>
                </div>
              </div>
            ))}

            {visibleBuses.length === 0 && locationShares.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active map locations right now</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

