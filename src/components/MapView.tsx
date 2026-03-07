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
  highlightBusRouteName?: string | null;
}

declare global {
  interface Window {
    L: any;
  }
}

export function MapView({
  busLocations,
  locationShares,
  currentLocation,
  userRole,
  userId,
  isLocationSharing,
  locationPermissionGranted,
  highlightBusRouteName
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const routeLayerRef = useRef<any>(null);
  const routingControlRef = useRef<any>(null);
  const lastRouteUpdateRef = useRef<number>(0);
  const lastWaypointSignatureRef = useRef<string>('');
  const lastHighlightedRouteRef = useRef<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [showBusDetails, setShowBusDetails] = useState(false);
  const [showRouteView, setShowRouteView] = useState(false);
  const [editingStops, setEditingStops] = useState(false);
  const [editedStops, setEditedStops] = useState<BusStop[]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [busSearchQuery, setBusSearchQuery] = useState('');
  const ROUTE_REFRESH_INTERVAL_MS = 3000;
  
  const onlineBuses = busLocations.filter(bus => bus.isOnline);

  const normalizeBusRouteName = (value: string | null | undefined) => (value || '').trim().toUpperCase();

  const isValidCoordinate = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Helper function to find the next bus stop
  const getNextBusStop = (bus: BusLocation): string => {
    if (!bus.busStops || bus.busStops.length === 0) {
      return 'No stops available';
    }

    // Find the first stop that hasn't been passed yet
    const nextStop = bus.busStops.find(stop => !stop.passed && stop.lat !== 0 && stop.lng !== 0);
    
    if (nextStop) {
      return nextStop.name;
    }

    // If all stops are passed or no valid stops, find the nearest stop
    const stopsWithDistance = bus.busStops
      .filter(stop => stop.lat !== 0 && stop.lng !== 0)
      .map(stop => ({
        ...stop,
        distance: calculateDistance(bus.lat, bus.lng, stop.lat, stop.lng)
      }))
      .sort((a, b) => a.distance - b.distance);

    if (stopsWithDistance.length > 0) {
      return stopsWithDistance[0].name;
    }

    // Fallback to first stop name
    return bus.busStops[0]?.name || 'Unknown';
  };

  // Filter buses based on search query
  const filteredBuses = onlineBuses.filter(bus => 
    bus.route.toLowerCase().includes(busSearchQuery.toLowerCase()) ||
    bus.driverName.toLowerCase().includes(busSearchQuery.toLowerCase())
  );

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

  // Load Leaflet + Leaflet Routing Machine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isCancelled = false;

    const ensureStyle = (id: string, href: string) => {
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    const ensureScript = (id: string, src: string, onLoad: () => void) => {
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') {
          onLoad();
        } else {
          existing.addEventListener('load', onLoad, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.setAttribute('data-loaded', 'true');
        onLoad();
      };
      document.head.appendChild(script);
    };

    const markReady = () => {
      if (!isCancelled) {
        setMapLoaded(true);
      }
    };

    const loadRoutingMachine = () => {
      ensureStyle('leaflet-routing-machine-css', 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css');

      if (window.L?.Routing) {
        markReady();
        return;
      }

      ensureScript(
        'leaflet-routing-machine-js',
        'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js',
        markReady
      );
    };

    ensureStyle('leaflet-css', 'https://unpkg.com/leaflet/dist/leaflet.css');

    if (window.L) {
      loadRoutingMachine();
    } else {
      ensureScript('leaflet-js', 'https://unpkg.com/leaflet/dist/leaflet.js', loadRoutingMachine);
    }

    return () => {
      isCancelled = true;
    };
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

  const loadBusStopsForBus = async (bus: BusLocation): Promise<BusStop[]> => {
    try {
      const response = await apiClient.getBusStops(bus.id);
      return response.busStops || bus.busStops || [];
    } catch (error) {
      console.error('Failed to load bus stops:', error);
      return bus.busStops || [];
    }
  };

  const buildFallbackBusForRoute = (
    busName: string,
    routeStops: BusStop[],
    routeMeta?: { isOnline?: boolean; busId?: string | null; lat?: number | null; lng?: number | null }
  ): BusLocation => {
    const firstValidStop = routeStops.find((stop) => isValidCoordinate(stop.lat, stop.lng));
    const routeIsOnline = Boolean(routeMeta?.isOnline);
    const hasLiveCoordinates =
      typeof routeMeta?.lat === 'number' &&
      typeof routeMeta?.lng === 'number' &&
      isValidCoordinate(routeMeta.lat, routeMeta.lng);

    return {
      id: routeMeta?.busId || `offline-route-${busName}`,
      driverName: routeIsOnline ? 'Live Bus' : 'Offline Route',
      route: busName,
      lat: hasLiveCoordinates ? (routeMeta?.lat as number) : (firstValidStop?.lat ?? currentLocation.lat),
      lng: hasLiveCoordinates ? (routeMeta?.lng as number) : (firstValidStop?.lng ?? currentLocation.lng),
      isOnline: routeIsOnline,
      lastUpdated: new Date().toISOString(),
      busStops: routeStops
    };
  };

  const highlightRouteFromBusName = async (busName: string) => {
    const normalizedName = normalizeBusRouteName(busName);
    if (!normalizedName) return;

    const onlineBus = onlineBuses.find(
      (bus) => normalizeBusRouteName(bus.route) === normalizedName
    );

    if (onlineBus) {
      const stops = await loadBusStopsForBus(onlineBus);
      setSelectedBus(onlineBus);
      setBusStops(stops);
      setEditedStops(stops);
      setShowBusDetails(false);
      setShowRouteView(true);
      drawRoutePath(onlineBus, stops, true);
      return;
    }

    try {
      const response = await apiClient.getRouteStopsByBusName(busName);
      const routeStops = (response.route?.busStops || []) as BusStop[];

      if (routeStops.length === 0) {
        toast.error(`No route stops configured for ${busName}`);
        return;
      }

      const routeBus = buildFallbackBusForRoute(busName, routeStops, response.route);
      setSelectedBus(routeBus);
      setBusStops(routeStops);
      setEditedStops(routeStops);
      setShowBusDetails(false);
      setShowRouteView(true);
      drawRoutePath(routeBus, routeStops, true);
    } catch (error) {
      console.error('Failed to highlight route by bus name:', error);
      toast.error(`Could not load route for ${busName}`);
    }
  };

  const handleBusClick = async (bus: BusLocation) => {
    // First click: Show bus details
    if (!selectedBus || selectedBus.id !== bus.id) {
      setSelectedBus(bus);
      setShowBusDetails(true);
      setShowRouteView(false);

      const stops = await loadBusStopsForBus(bus);
      setBusStops(stops);
      setEditedStops(stops);
    } else {
      // Second click: Show route view with path on map
      setShowBusDetails(false);
      setShowRouteView(true);
      drawRoutePath(bus, busStops, true);
    }
    
    setEditingStops(false);
    setNewRouteName('');
  };

  const clearActiveRoute = (removeRoutingControl = false) => {
    if (!mapInstance.current) return;

    if (routeLayerRef.current) {
      mapInstance.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
      delete markersRef.current['routeLayer'];
    }

    if (routingControlRef.current) {
      if (removeRoutingControl) {
        mapInstance.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      } else {
        try {
          routingControlRef.current.setWaypoints([]);
        } catch (error) {
          console.warn('Failed to clear routing waypoints:', error);
        }
      }
    }

    lastRouteUpdateRef.current = 0;
    lastWaypointSignatureRef.current = '';
  };

  const getStopCoordinates = (bus: BusLocation, stops: BusStop[]) => {
    return stops.map((stop, index) => {
      if (stop.lat && stop.lng) {
        return { lat: stop.lat, lng: stop.lng, stop, index };
      }

      const offset = 0.01;
      const angle = (index / Math.max(stops.length, 1)) * Math.PI * 2;
      return {
        lat: bus.lat + Math.sin(angle) * offset * (index + 1),
        lng: bus.lng + Math.cos(angle) * offset * (index + 1),
        stop,
        index
      };
    });
  };

  const ensureRoutingControl = (map: any, L: any) => {
    if (routingControlRef.current) {
      return routingControlRef.current;
    }

    if (!L?.Routing) {
      return null;
    }

    const routingControl = L.Routing.control({
      waypoints: [],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      showAlternatives: false,
      fitSelectedRoutes: false,
      show: false,
      createMarker: () => null,
      lineOptions: {
        styles: [{ color: '#ec4899', weight: 6, opacity: 0.9 }]
      }
    }).addTo(map);

    const itineraryContainer = routingControl.getContainer?.();
    if (itineraryContainer) {
      itineraryContainer.style.display = 'none';
    }

    routingControl.on('routingerror', (error: any) => {
      console.warn('OSRM routing failed:', error);
    });

    routingControlRef.current = routingControl;
    return routingControl;
  };

  const drawRoutePath = (bus: BusLocation, stops: BusStop[], forceUpdate = false) => {
    if (!mapInstance.current || !mapLoaded) return;
    
    const L = window.L;
    const map = mapInstance.current;
    const stopCoordinates = getStopCoordinates(bus, stops);

    if (!window.L?.Routing) {
      console.warn('Leaflet Routing Machine is not available');
      return;
    }

    if (!routeLayerRef.current) {
      routeLayerRef.current = L.layerGroup().addTo(map);
      markersRef.current['routeLayer'] = routeLayerRef.current;
    }

    const routeLayer = routeLayerRef.current;
    const shouldRedrawStops = forceUpdate || routeLayer.getLayers().length === 0;
    if (shouldRedrawStops) {
      routeLayer.clearLayers();

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
    }

    // Route path order: starting point -> live bus (if online) -> all stops/destination
    const waypointLatLngs = [L.latLng(currentLocation.lat, currentLocation.lng)];

    if (bus.isOnline && isValidCoordinate(bus.lat, bus.lng)) {
      waypointLatLngs.push(L.latLng(bus.lat, bus.lng));
    }

    waypointLatLngs.push(...stopCoordinates.map(({ lat, lng }) => L.latLng(lat, lng)));

    if (waypointLatLngs.length < 2) {
      return;
    }

    const waypointSignature = waypointLatLngs
      .map((waypoint: any) => `${waypoint.lat.toFixed(6)},${waypoint.lng.toFixed(6)}`)
      .join('|');

    if (!forceUpdate && waypointSignature === lastWaypointSignatureRef.current) {
      return;
    }

    const now = Date.now();
    if (!forceUpdate && now - lastRouteUpdateRef.current < ROUTE_REFRESH_INTERVAL_MS) {
      return;
    }

    const routingControl = ensureRoutingControl(map, L);
    if (!routingControl) return;

    lastRouteUpdateRef.current = now;
    lastWaypointSignatureRef.current = waypointSignature;
    routingControl.setWaypoints(waypointLatLngs);

    if (forceUpdate) {
      const bounds = L.latLngBounds(waypointLatLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const handleCloseDetails = () => {
    setShowBusDetails(false);
    setShowRouteView(false);
    setSelectedBus(null);
    clearActiveRoute(false);
  };

  // Highlight a route requested from chatbot/map query link.
  useEffect(() => {
    if (!mapLoaded || !highlightBusRouteName) return;

    const normalizedRouteName = normalizeBusRouteName(highlightBusRouteName);
    if (!normalizedRouteName || normalizedRouteName === lastHighlightedRouteRef.current) {
      return;
    }

    lastHighlightedRouteRef.current = normalizedRouteName;
    highlightRouteFromBusName(highlightBusRouteName);
  }, [highlightBusRouteName, mapLoaded]);

  // Keep selected bus location in sync with live updates
  useEffect(() => {
    if (!selectedBus) return;
    const latestBus = onlineBuses.find(
      (bus) =>
        bus.id === selectedBus.id ||
        normalizeBusRouteName(bus.route) === normalizeBusRouteName(selectedBus.route)
    );
    if (!latestBus) return;

    if (
      latestBus.lat !== selectedBus.lat ||
      latestBus.lng !== selectedBus.lng ||
      latestBus.lastUpdated !== selectedBus.lastUpdated
    ) {
      setSelectedBus(latestBus);
    }
  }, [onlineBuses, selectedBus?.id, selectedBus?.lat, selectedBus?.lng, selectedBus?.lastUpdated]);

  // Force route draw when route view opens or stop list changes
  useEffect(() => {
    if (!showRouteView || !selectedBus) return;
    drawRoutePath(selectedBus, busStops, true);
  }, [showRouteView, selectedBus?.id, busStops]);

  // Smooth live route updates; throttled inside drawRoutePath
  useEffect(() => {
    if (!showRouteView || !selectedBus) return;
    drawRoutePath(selectedBus, busStops, false);
  }, [
    selectedBus?.lat,
    selectedBus?.lng,
    selectedBus?.lastUpdated,
    currentLocation.lat,
    currentLocation.lng,
    mapLoaded
  ]);

  // Cleanup route controls on unmount
  useEffect(() => {
    return () => {
      clearActiveRoute(true);
    };
  }, []);

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
                  <p className="text-lg font-medium">No bus Routes are Provided</p>
                  <p className="text-sm mt-2">Routes have not been configured for this bus yet.</p>
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
                            
                            {canEditBus && (
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
                    <div className="overflow-x-auto pb-1">
                      <div className="flex gap-2 min-w-max">
                        {busStops.map((stop) => (
                          <Button
                            key={stop.id}
                            size="sm"
                            variant={stop.passed ? "outline" : "default"}
                            onClick={() => handleStopToggle(stop.id, stop.passed)}
                            className="text-xs whitespace-nowrap"
                          >
                            {stop.name.substring(0, 10)}...
                          </Button>
                        ))}
                      </div>
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
          
          {/* Search Field */}
          {onlineBuses.length > 0 && (
            <div className="mb-3">
              <Input
                placeholder="Search buses by name or driver..."
                value={busSearchQuery}
                onChange={(e) => setBusSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-3">
            {/* Current User Location */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm ring-2 ring-green-100 ring-offset-0 animate-pulse"></div>
                  <div className="absolute -inset-1 bg-green-400 rounded-full opacity-20 animate-ping"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-900">Your Location</span>
                    {isLocationSharing && (
                      <Badge variant="outline" className="h-5 px-1.5 py-0 bg-yellow-100 text-yellow-700 border-yellow-200 text-[9px] font-bold animate-bounce">
                        +10 COINS
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-green-600 font-medium">
                    {isLocationSharing ? 'Sharing live location' : 'Tracking current position'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-mono text-green-700 bg-white/60 px-2 py-0.5 rounded border border-green-100 block">
                    {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                  </span>
                  <p className="text-[9px] text-green-500/70 mt-0.5">Swipe down to refresh</p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-green-600 hover:bg-green-100 rounded-full transition-all active:scale-90 active:rotate-180"
                  onClick={() => {
                    if (navigator.geolocation) {
                      const toastId = toast.loading("Locating...");
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const { latitude, longitude } = pos.coords;
                          if (mapInstance.current) {
                            mapInstance.current.setView([latitude, longitude], 16, { animate: true });
                            toast.success("Location found and updated", { id: toastId });
                          }
                        },
                        () => {
                          toast.error("Location refresh failed, reloading page...", { id: toastId });
                          setTimeout(() => window.location.reload(), 1500);
                        },
                        { enableHighAccuracy: true, timeout: 5000 }
                      );
                    } else {
                      window.location.reload();
                    }
                  }}
                  title="Refresh map and state"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Buses */}
            {filteredBuses.map((bus) => (
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
                  <span className="text-sm font-medium text-purple-700">
                    Next: {getNextBusStop(bus)}
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

            {filteredBuses.length === 0 && onlineBuses.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No buses match your search</p>
              </div>
            )}

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
