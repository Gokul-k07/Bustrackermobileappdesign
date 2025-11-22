import React, { useState, useEffect } from 'react';
import { Play, Square, QrCode, Users, MapPin, Clock, Copy, Bus, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { OTP, LocationShare } from '../App';
import { getAvailableBuses, addNewBus } from '../utils/api';

interface DriverDashboardProps {
  isOnline: boolean;
  onToggleOnline: (busName?: string) => void;
  onGenerateOTP: () => void;
  otps: OTP[];
  locationShares: LocationShare[];
  currentLocation: { lat: number; lng: number };
  onStopOTP?: (otpId: string) => void;
  onStopPassengerSharing?: (shareId: string) => void;
}

export function DriverDashboard({ 
  isOnline, 
  onToggleOnline, 
  onGenerateOTP, 
  otps, 
  locationShares,
  currentLocation,
  onStopOTP,
  onStopPassengerSharing
}: DriverDashboardProps) {
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [showBusSelectionDialog, setShowBusSelectionDialog] = useState(false);
  const [availableBuses, setAvailableBuses] = useState<string[]>([]);
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [showAddNewBus, setShowAddNewBus] = useState(false);
  const [newBusName, setNewBusName] = useState('');
  const [busError, setBusError] = useState<string>('');
  const [busesInUse, setBusesInUse] = useState<string[]>([]);

  const activeOTPs = otps.filter(otp => !otp.used && new Date() < new Date(otp.expiresAt));
  const recentOTP = activeOTPs[activeOTPs.length - 1];

  // Load available buses on mount
  useEffect(() => {
    loadAvailableBuses();
  }, []);

  const loadAvailableBuses = async () => {
    try {
      const buses = await getAvailableBuses();
      setAvailableBuses(buses);
      
      // Fetch all active bus locations to determine which buses are in use
      const response = await fetch(`${window.location.origin}/functions/v1/make-server-8b08beda/buses`);
      if (response.ok) {
        const data = await response.json();
        const activeBusNames = data.buses.map((bus: any) => bus.route);
        setBusesInUse(activeBusNames);
      }
    } catch (error) {
      console.error('Failed to load buses:', error);
      toast.error('Failed to load bus list');
    }
  };

  const copyOTP = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('OTP copied to clipboard');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const timeUntilExpiry = (expiresAtString: string) => {
    const now = new Date();
    const expiresAt = new Date(expiresAtString);
    const diff = expiresAt.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartTrip = () => {
    if (isOnline) {
      onToggleOnline();
      setBusError('');
    } else {
      setBusError('');
      setShowBusSelectionDialog(true);
      loadAvailableBuses(); // Refresh the list of buses in use
    }
  };

  const handleConfirmBusSelection = () => {
    if (!selectedBus) {
      toast.error('Please select a bus');
      return;
    }
    
    // Check if the bus is already in use
    if (busesInUse.includes(selectedBus)) {
      toast.error('This bus location is already being shared');
      setBusError('❌ Driver status update error: Error: This bus location is already being shared');
      setShowBusSelectionDialog(false);
      setSelectedBus('');
      setShowAddNewBus(false);
      return;
    }
    
    setShowBusSelectionDialog(false);
    setBusError('');
    onToggleOnline(selectedBus);
    setSelectedBus('');
    setShowAddNewBus(false);
  };

  const handleAddNewBus = async () => {
    if (!newBusName.trim()) {
      toast.error('Please enter a bus name');
      return;
    }

    const formattedName = newBusName.trim().startsWith('PSNA-') 
      ? newBusName.trim() 
      : `PSNA-${newBusName.trim()}`;

    try {
      const updatedBuses = await addNewBus(formattedName);
      setAvailableBuses(updatedBuses);
      setSelectedBus(formattedName);
      setNewBusName('');
      setShowAddNewBus(false);
      toast.success('New bus added successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add new bus');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Driver Status
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleStartTrip}
            className="w-full"
            variant={isOnline ? 'destructive' : 'default'}
          >
            {isOnline ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Trip
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Trip
              </>
            )}
          </Button>
          
          {busError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {busError}
            </div>
          )}
          
          {isOnline && (
            <div className="text-sm text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                Broadcasting location to passengers
              </div>
              <p className="mt-1">
                Location: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </p>
              <div className="mt-2 p-2 bg-green-50 rounded text-green-700 text-xs">
                ✅ You earned 10 coins for sharing your location!
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OTP Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Location Sharing OTP
            <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <QrCode className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Active OTPs</DialogTitle>
                  <DialogDescription>
                    View and manage all active OTP codes for passenger location sharing.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {activeOTPs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No active OTPs
                    </p>
                  ) : (
                    activeOTPs.map((otp) => (
                      <Card key={otp.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-mono font-bold text-lg">{otp.code}</p>
                              <p className="text-sm text-muted-foreground">
                                Valid for: 5 hours
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyOTP(otp.code)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {onStopOTP && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => onStopOTP(otp.id)}
                                >
                                  Stop
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentOTP ? (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-2xl">{recentOTP.code}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyOTP(recentOTP.code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires in: {timeUntilExpiry(recentOTP.expiresAt)}
                </div>
                <span>Created: {formatTime(recentOTP.createdAt)}</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No active OTP. Generate one to allow passengers to share location.
            </p>
          )}
          
          <Button onClick={onGenerateOTP} className="w-full" variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            Generate New OTP
          </Button>
        </CardContent>
      </Card>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Passengers Sharing Location
            <Badge variant="secondary">
              {locationShares.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationShares.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No passengers are currently sharing their location
            </p>
          ) : (
            <div className="space-y-3">
              {locationShares.slice(0, 3).map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{share.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      Since: {formatTime(share.startTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {share.lat.toFixed(4)}, {share.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Active</Badge>
                    {onStopPassengerSharing && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onStopPassengerSharing(share.id)}
                      >
                        Stop
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {locationShares.length > 3 && (
                <Dialog open={showUsersDialog} onOpenChange={setShowUsersDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Users className="mr-2 h-4 w-4" />
                      View All {locationShares.length} Users
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>All Active Users</DialogTitle>
                      <DialogDescription>
                        List of all passengers currently sharing their location with you.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {locationShares.map((share) => (
                        <Card key={share.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{share.userName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Started: {formatTime(share.startTime)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Location: {share.lat.toFixed(4)}, {share.lng.toFixed(4)}
                                </p>
                              </div>
                              <Badge variant="outline">Active</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bus Selection Dialog */}
      <Dialog open={showBusSelectionDialog} onOpenChange={setShowBusSelectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Select Your Bus
            </DialogTitle>
            <DialogDescription>
              Choose the bus you'll be driving to start your trip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!showAddNewBus ? (
              <>
                <div>
                  <Label htmlFor="busSelect">Choose Bus Number</Label>
                  <Select value={selectedBus} onValueChange={setSelectedBus}>
                    <SelectTrigger id="busSelect">
                      <SelectValue placeholder="Select a bus..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBuses.map((bus) => {
                        const isInUse = busesInUse.includes(bus);
                        return (
                          <SelectItem 
                            key={bus} 
                            value={bus}
                            disabled={isInUse}
                            className={isInUse ? 'text-gray-400 cursor-not-allowed' : ''}
                          >
                            {bus} {isInUse && '(Already Shared)'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select the bus you'll be driving
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowAddNewBus(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Bus
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowBusSelectionDialog(false);
                      setSelectedBus('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmBusSelection}
                    className="flex-1"
                    disabled={!selectedBus}
                  >
                    Start Trip
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="newBusName">New Bus Number</Label>
                  <Input
                    id="newBusName"
                    placeholder="e.g., 14 or PSNA-14"
                    value={newBusName}
                    onChange={(e) => setNewBusName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewBus()}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter just the number (e.g., "14") or full name (e.g., "PSNA-14")
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddNewBus(false);
                      setNewBusName('');
                    }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleAddNewBus}
                    className="flex-1"
                  >
                    Add Bus
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}