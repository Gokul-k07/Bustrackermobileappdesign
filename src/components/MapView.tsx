import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Bus, Users, Navigation, ZoomIn, ZoomOut, RotateCcw, X, CheckCircle, Circle, Edit2, Save, Plus, Trash2, Clock, TrendingUp, Compass, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { BusLocation, LocationShare, UserRole, BusStop } from '../App';
import { apiClient } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface MapViewProps {
  busLocations: BusLocation[];
  locationShares: LocationShare[];
  currentLocation: { lat: number; lng: number };
  userRole: UserRole;
  userId?: string;
  isLocationSharing?: boolean;
  locationPermissionGranted?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

export function MapView({ busLocations, locationShares, currentLocation, userRole, userId, isLocationSharing, locationPermissionGranted }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const routeLayerRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [showBusDetails, setShowBusDetails] = useState(false);
  const [showRouteView, setShowRouteView] = useState(false);
  const [editingStops, setEditingStops] = useState(false);
  const [editedStops, setEditedStops] = useState<BusStop[]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  
  const onlineBuses = busLocations.filter(bus => bus.isOnline);

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

      // Add dark MapTiler tile layer
      const API_KEY = "3rn9Pt2DDS2PIVE5bwGb";
      L.tileLayer(`https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${API_KEY}`, {
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">© MapTiler</a>',
        maxZoom: 18,
        noWrap: false,
      }).addTo(mapInstance.current);

      // Add custom zoom control in top-right
      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstance.current);
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

    // Only show user location if:
    // 1. User is a passenger AND is sharing location (show as bus icon)
    // 2. User is a driver AND is online (don't show - will be shown as bus)
    // 3. Location permission is granted AND user wants to see their location
    
    // For passengers sharing location, show as purple bus icon (same as other buses they're tracking)
    if (userRole === 'passenger' && isLocationSharing && locationPermissionGranted) {
      const userSharingIcon = L.divIcon({
        html: `
          <div style="
            background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
            width: 28px;
            height: 28px;
            border-radius: 6px;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          ">🚌</div>
        `,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const userMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon: userSharingIcon })
        .addTo(mapInstance.current)
        .bindPopup(`<div style="color: #1f2937; font-family: sans-serif;"><b>Your Location</b><br/>Sharing Active<br/>Lat: ${currentLocation.lat.toFixed(4)}<br/>Lng: ${currentLocation.lng.toFixed(4)}</div>`);
      
      markersRef.current['user'] = userMarker;
    }

    // Add bus markers with PURPLE/MAGENTA color
    onlineBuses.forEach((bus) => {
      const busIcon = L.divIcon({
        html: `
          <div style="
            background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: pointer;
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
      
      markersRef.current[`bus-${bus.id}`] = busMarker;
    });

    // Add passenger markers - CYAN/TEAL for sharing passengers (driver view only)
    if (userRole === 'driver') {
      locationShares.forEach((share) => {
        const passengerIcon = L.divIcon({
          html: `
            <div style="
              background: linear-gradient(135deg, #06b6d4 0%, #14b8a6 100%);
              width: 28px;
              height: 28px;
              border-radius: 6px;
              border: 2px solid white;
              box-shadow: 0 4px 12px rgba(6, 182, 212, 0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            ">🚌</div>
          `,
          className: 'custom-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const passengerMarker = L.marker([share.lat, share.lng], { icon: passengerIcon })
          .addTo(mapInstance.current)
          .bindPopup(`<div style="color: #1f2937; font-family: sans-serif;"><b>${share.userName}</b><br/>Passenger Sharing<br/>Since: ${formatTime(share.startTime)}</div>`);
        
        markersRef.current[`passenger-${share.id}`] = passengerMarker;
      });
    }

  }, [mapLoaded, currentLocation, onlineBuses, locationShares, userRole, isLocationSharing, locationPermissionGranted]);

  const handleBusClick = async (bus: BusLocation) => {
    // First click: Show bus details
    if (!selectedBus || selectedBus.id !== bus.id) {
      setSelectedBus(bus);
      setShowBusDetails(true);
      setShowRouteView(false);
      
      // Load bus stops
      try {
        const response = await apiClient.getBusStops(bus.id);
        const stops = response.busStops || bus.busStops || [];
        setBusStops(stops);
        setEditedStops(stops);
      } catch (error) {
        console.error('Failed to load bus stops:', error);
        const stops = bus.busStops || [];
        setBusStops(stops);
        setEditedStops(stops);
      }
    } else {
      // Second click: Show route view with path on map
      setShowBusDetails(false);
      setShowRouteView(true);
      drawRoutePath(bus, busStops);
    }
    
    setEditingStops(false);
    setNewRouteName('');
  };

  const drawRoutePath = (bus: BusLocation, stops: BusStop[]) => {
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
    
    // Draw route line with gradient effect (magenta/purple)
    const routeCoordinates: [number, number][] = [];
    
    // Add bus current position as start
    routeCoordinates.push([bus.lat, bus.lng]);
    
    // Add all stops - use actual lat/lng if available, otherwise generate around bus location
    stops.forEach((stop, index) => {
      let lat, lng;
      
      if (stop.lat && stop.lng) {
        // Use actual coordinates if available
        lat = stop.lat;
        lng = stop.lng;
      } else {
        // Generate coordinates around bus location if not set
        const offset = 0.01;
        const angle = (index / stops.length) * Math.PI * 2;
        lat = bus.lat + Math.sin(angle) * offset * (index + 1);
        lng = bus.lng + Math.cos(angle) * offset * (index + 1);
      }
      
      routeCoordinates.push([lat, lng]);
      
      // Add stop marker
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

    // Draw polyline
    L.polyline(routeCoordinates, {
      color: '#ec4899',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 5'
    }).addTo(routeLayer);

    routeLayerRef.current = routeLayer;
    markersRef.current['routeLayer'] = routeLayer;

    // Fit map to show route
    const bounds = L.latLngBounds(routeCoordinates);
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const handleCloseDetails = () => {
    setShowBusDetails(false);
    setShowRouteView(false);
    setSelectedBus(null);
    
    // Remove route layer
    if (routeLayerRef.current && mapInstance.current) {
      mapInstance.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
      delete markersRef.current['routeLayer'];
    }
  };

  const handleStopToggle = async (stopId: string, currentPassed: boolean) => {
    if (userRole !== 'driver') return;
    
    try {
      await apiClient.updateBusStop(stopId, !currentPassed);
      setBusStops(prev => prev.map(stop => 
        stop.id === stopId ? { ...stop, passed: !currentPassed } : stop
      ));
      setEditedStops(prev => prev.map(stop => 
        stop.id === stopId ? { ...stop, passed: !currentPassed } : stop
      ));
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
    if (userRole !== 'driver' || !selectedBus) return;
    
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
    if (userRole !== 'driver' || !selectedBus || !newRouteName.trim()) {
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

  const canEditBus = userRole === 'driver' && selectedBus?.id === userId;

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
                  <p className="text-sm text-white/80">Click again to view full route</p>
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
            className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          />
          
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg">
              <div className="text-center">
                <Bus className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-400">Loading interactive map...</p>
              </div>
            </div>
          )}

          {/* Map Attribution */}
          <div className="absolute bottom-1 right-1 bg-black/70 px-2 py-1 rounded text-xs text-white/70 z-[1000]">
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
                <div className="divide-y">
                  {/* Column Headers - Removed Access column */}
                  <div className="grid grid-cols-11 gap-2 p-3 bg-gray-50 text-xs font-medium text-gray-600">
                    <div className="col-span-1">Stop</div>
                    <div className="col-span-3">Start Time</div>
                    <div className="col-span-3">End Time</div>
                    <div className="col-span-4">Stop Name</div>
                  </div>

                  {/* Stop Rows - Same routes for morning and evening */}
                  {stopsWithTimes.map((stop, index) => (
                    <div 
                      key={stop.id} 
                      className={`grid grid-cols-11 gap-2 p-3 text-sm hover:bg-gray-50 transition-colors ${
                        stop.passed ? 'bg-gray-100' : ''
                      }`}
                    >
                      <div className="col-span-1 font-medium text-purple-600">
                        {index + 1}
                      </div>
                      <div className="col-span-3 text-gray-600">{stop.outbound.start}</div>
                      <div className="col-span-3 text-gray-600">{stop.outbound.end}</div>
                      <div className="col-span-4 flex items-center gap-2">
                        {stop.passed && <CheckCircle className="h-4 w-4 text-gray-400" />}
                        <span className={stop.passed ? 'text-gray-500 line-through' : 'font-medium'}>{stop.name}</span>
                      </div>
                    </div>
                  ))}
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
              <span>Active Buses</span>
            </div>
            {userRole === 'driver' && (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-teal-500 rounded border-2 border-white shadow flex items-center justify-center text-[10px]">🚌</div>
                <span>Passengers Sharing</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location List */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 font-medium">
            {userRole === 'driver' ? 'All Locations' : 'Available Buses'}
          </h4>
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

            {/* Buses */}
            {onlineBuses.map((bus) => (
              <div 
                key={bus.id} 
                className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => handleBusClick(bus)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded border-2 border-white shadow flex items-center justify-center text-xs">🚌</div>
                  <div>
                    <span className="font-medium">{bus.route}</span>
                    <p className="text-xs text-muted-foreground">{bus.driverName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground font-mono">
                    {bus.lat.toFixed(4)}, {bus.lng.toFixed(4)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(bus.lastUpdated)}
                  </p>
                </div>
              </div>
            ))}

            {/* Passengers (Driver view only) */}
            {userRole === 'driver' && locationShares.map((share) => (
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

            {onlineBuses.length === 0 && userRole === 'passenger' && (
              <div className="text-center py-8 text-muted-foreground">
                <Bus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No buses are currently online</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
