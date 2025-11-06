import React, { useState } from 'react';
import { MapPin, Bus, Coins, Share2, Square, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { BusLocation } from '../App';

interface PassengerDashboardProps {
  busLocations: BusLocation[];
  onStartLocationSharing: (otpCode: string, busName: string) => void;
  isLocationSharing: boolean;
  onStopLocationSharing: () => void;
  userCoins: number;
  currentLocation: { lat: number; lng: number };
  onBuyCoinPackage: (amount: number) => void;
  availableBuses: string[];
}

export function PassengerDashboard({
  busLocations,
  onStartLocationSharing,
  isLocationSharing,
  onStopLocationSharing,
  userCoins,
  currentLocation,
  onBuyCoinPackage,
  availableBuses
}: PassengerDashboardProps) {
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showCoinDialog, setShowCoinDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [selectedBus, setSelectedBus] = useState('');

  const onlineBuses = busLocations.filter(bus => bus.isOnline);

  const handleLocationShare = () => {
    if (otpCode.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    if (!selectedBus) {
      toast.error('Please select a bus');
      return;
    }
    
    onStartLocationSharing(otpCode.trim(), selectedBus);
    setOtpCode('');
    setSelectedBus('');
    setShowLocationDialog(false);
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true, 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const buyCoinPackage = (amount: number, price: string) => {
    onBuyCoinPackage(amount);
    setShowCoinDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Coin Balance & Location Status */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coin Balance</p>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  {userCoins}
                </p>
              </div>
              <Dialog open={showCoinDialog} onOpenChange={setShowCoinDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Get More Coins</DialogTitle>
                    <DialogDescription>
                      Purchase coin packages to share your location with drivers.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Card className="cursor-pointer hover:bg-muted/50" onClick={() => buyCoinPackage(50, '$2.99')}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">50 Coins</p>
                            <p className="text-sm text-muted-foreground">Best for casual use</p>
                          </div>
                          <p className="font-bold">$2.99</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:bg-muted/50" onClick={() => buyCoinPackage(100, '$4.99')}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">100 Coins</p>
                            <p className="text-sm text-muted-foreground">Most popular</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">$4.99</p>
                            <p className="text-xs text-green-600">Save 17%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:bg-muted/50" onClick={() => buyCoinPackage(250, '$9.99')}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">250 Coins</p>
                            <p className="text-sm text-muted-foreground">Best value</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">$9.99</p>
                            <p className="text-xs text-green-600">Save 33%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Location Sharing</p>
                <p className="text-lg font-semibold">
                  {isLocationSharing ? 'Active' : 'Inactive'}
                </p>
              </div>
              <Badge variant={isLocationSharing ? 'default' : 'secondary'}>
                {isLocationSharing ? <Share2 className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Sharing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLocationSharing ? (
            <div>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-green-800">
                  <Share2 className="h-4 w-4" />
                  <span className="font-medium">Location sharing is active</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your location is being shared with the bus driver
                </p>
              </div>
              <Button 
                onClick={onStopLocationSharing}
                variant="outline"
                className="w-full"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Sharing Location
              </Button>
            </div>
          ) : (
            <div>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> Get a 5-hour valid OTP from the bus driver, 
                  select your bus, and share your location (works like driver mode).
                </p>
              </div>
              <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share My Location (5 Hours)
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Your Location</DialogTitle>
                    <DialogDescription>
                      Get a 5-hour valid OTP from the driver, select your bus, and share your location.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="otp">Enter OTP Code (Valid for 5 hours)</Label>
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="text-center font-mono text-lg"
                        maxLength={6}
                      />
                    </div>
                    <div>
                      <Label htmlFor="busSelect">Select Bus</Label>
                      <select
                        id="busSelect"
                        value={selectedBus}
                        onChange={(e) => setSelectedBus(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="">Choose a bus...</option>
                        {availableBuses.map((bus) => (
                          <option key={bus} value={bus}>{bus}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Cost: 10 coins</span>
                      <span>Your balance: {userCoins} coins</span>
                    </div>
                    <Button 
                      onClick={handleLocationShare}
                      className="w-full"
                      disabled={otpCode.length !== 6 || userCoins < 10}
                    >
                      Start Sharing Location
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {userCoins < 10 && (
                <p className="text-sm text-destructive text-center mt-2">
                  Insufficient coins. You need at least 10 coins to share your location.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nearby Buses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Nearby Buses
            <Badge variant="secondary">
              {onlineBuses.length} online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onlineBuses.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No buses are currently online</p>
              <p className="text-sm text-muted-foreground mt-1">
                Check back later or contact your bus service
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {onlineBuses.map((bus) => {
                const distance = calculateDistance(
                  currentLocation.lat, 
                  currentLocation.lng, 
                  bus.lat, 
                  bus.lng
                );
                
                const lastUpdated = new Date(bus.lastUpdated);
                
                return (
                  <Card key={bus.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Bus className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{bus.route}</p>
                            <p className="text-sm text-muted-foreground">
                              Driver: {bus.driverName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated: {formatTime(lastUpdated)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}