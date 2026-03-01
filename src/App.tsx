import React, { useState, useEffect } from 'react';
import { MapPin, Bus, Users, Coins, Settings, Play, Square, QrCode, Share2, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Textarea } from './components/ui/textarea';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { toast } from 'sonner@2.0.3';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { apiClient } from './utils/api';
import { OnboardingFlow } from './components/OnboardingFlow';
import { RoleSelection } from './components/RoleSelection';
import { DriverDashboard } from './components/DriverDashboard';
import { PassengerDashboard } from './components/PassengerDashboard';
import { MapView } from './components/MapView';
import { AIChat } from './components/AIChat';

export type UserRole = 'driver' | 'passenger' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  coins?: number;
}

export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  passed: boolean;
}

export interface BusLocation {
  id: string;
  driverName: string;
  route: string;
  lat: number;
  lng: number;
  isOnline: boolean;
  lastUpdated: string;
  busStops?: BusStop[];
}

export interface LocationShare {
  id: string;
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  active: boolean;
  startTime: string;
  driverId: string;
}

export interface OTP {
  id: string;
  code: string;
  driverId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

// Initialize Supabase client
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export default function App() {
  // App state
  const [currentScreen, setCurrentScreen] = useState<'onboarding' | 'roleSelection' | 'main'>('onboarding');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Driver state
  const [isOnline, setIsOnline] = useState(false);
  const [otps, setOtps] = useState<OTP[]>([]);
  const [locationShares, setLocationShares] = useState<LocationShare[]>([]);

  // Passenger state
  const [busLocations, setBusLocations] = useState<BusLocation[]>([]);
  const [isLocationSharing, setIsLocationSharing] = useState(false);

  // Current location with geolocation support (default to PSNACET location in Tamil Nadu, India)
  const [currentLocation, setCurrentLocation] = useState({ lat: 10.3673, lng: 77.9738 });
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  // Navigation state
  const [activeTab, setActiveTab] = useState('home');
  
  // Bus selection and available buses
  const [availableBuses, setAvailableBuses] = useState<string[]>([]);
  const [selectedBusForSharing, setSelectedBusForSharing] = useState('');
  const [tripHistory, setTripHistory] = useState<any[]>([]);

  // Feedback state
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');


  // Check for existing session, restore state, and setup geolocation on mount
  useEffect(() => {
    restoreAppState();
    checkSession();
    requestLocationPermission();
  }, []);

  // Restore app state from localStorage
  const restoreAppState = () => {
    try {
      const savedState = localStorage.getItem('bustracker_app_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.isOnline) setIsOnline(state.isOnline);
        if (state.isLocationSharing) setIsLocationSharing(state.isLocationSharing);
      }
    } catch (error) {
      console.error('Failed to restore app state:', error);
    }
  };

  // Save app state to localStorage
  const saveAppState = () => {
    try {
      const state = {
        activeTab,
        isOnline,
        isLocationSharing,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('bustracker_app_state', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save app state:', error);
    }
  };

  // Save state whenever it changes
  useEffect(() => {
    if (user) {
      saveAppState();
    }
  }, [activeTab, isOnline, isLocationSharing]);

  const loadAvailableBuses = async () => {
    try {
      const response = await apiClient.getAvailableBuses();
      setAvailableBuses(response.buses || []);
    } catch (error: any) {
      console.warn('Failed to load available buses:', error.message || 'Unknown error');
    }
  };

  const requestLocationPermission = () => {
    // Check if the current environment supports geolocation
    if (typeof navigator !== 'undefined' && "geolocation" in navigator) {
      try {
        // First check the Permissions API if available
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(permissionStatus => {
            if (permissionStatus.state === 'denied') {
              console.warn('Geolocation permission was previously denied');
              setLocationPermissionGranted(false);
            }
          }).catch(err => console.warn('Permissions API not supported or error:', err));
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            setLocationPermissionGranted(true);
            
            // Set up location tracking for continuous updates
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                setCurrentLocation({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                });
              },
              (error) => {
                console.warn('Location tracking error:', error);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
              }
            );

            return () => {
              navigator.geolocation.clearWatch(watchId);
            };
          },
          (error) => {
            console.warn('Geolocation error:', error.message || error.code);
            setLocationPermissionGranted(false);
            
            // Provide helpful feedback for policy restrictions
            if (error.code === 1) { // PERMISSION_DENIED
              toast.error('Location Permission Denied', {
                description: 'Please enable location services in your browser settings to use live tracking.',
                duration: 5000
              });
            } else if (error.message && error.message.includes('permissions policy')) {
              console.error('Permission policy blocks geolocation');
              // This is often due to iframe restrictions or cross-origin issues
            }
          },
          {
            enableHighAccuracy: false, // Use lower accuracy for initial check to avoid some policy blocks
            timeout: 5000,
            maximumAge: Infinity
          }
        );
      } catch (err: any) {
        console.warn('Geolocation initialization error:', err);
        setLocationPermissionGranted(false);
      }
    } else {
      console.warn('Geolocation not supported by this browser');
    }
  };

  // Set up real-time data fetching when user is authenticated
  useEffect(() => {
    if (session && user) {
      apiClient.setAccessToken(session.access_token);
      
      // Initial data load
      loadUserData();
      loadAvailableBuses(); // Load buses after authentication
      
      // Set up periodic updates for real-time location display
      const interval = setInterval(() => {
        if (user.role === 'driver') {
          loadDriverData();
        } else if (user.role === 'passenger') {
          loadPassengerData();
        }
      }, 1000); // Update every second for real-time tracking

      return () => clearInterval(interval);
    }
  }, [session, user]);

  // Set up location updates for active sharing (passengers) and drivers online
  // Updates every second for real-time tracking, even when app is in background
  useEffect(() => {
    if (locationPermissionGranted && user) {
      const shouldUpdate = 
        (user.role === 'passenger' && isLocationSharing) || 
        (user.role === 'driver' && isOnline);

      if (shouldUpdate) {
        // Set up background location tracking with watchPosition for continuous updates
        let watchId: number | null = null;
        
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            async (position) => {
              const newLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              
              // Update immediately on position change
              try {
                if (user.role === 'passenger' && isLocationSharing) {
                  const result = await apiClient.updateLocation(newLocation);
                  // Check if sharing expired
                  if (result.expired) {
                    setIsLocationSharing(false);
                    localStorage.removeItem('bustracker_sharing_state');
                  }
                } else if (user.role === 'driver' && isOnline) {
                  await apiClient.updateDriverStatus(true, newLocation);
                }
              } catch (error: any) {
                if (error.message?.includes('expired')) {
                  setIsLocationSharing(false);
                  localStorage.removeItem('bustracker_sharing_state');
                }
                console.error('Failed to update location:', error);
              }
            },
            (error) => {
              console.warn('Location tracking error:', error.message || error.code);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 1000, // Accept cached positions up to 1 second old
              timeout: 5000
            }
          );
        }

        // Also set up interval updates every second as backup
        const updateInterval = setInterval(async () => {
          try {
            if (user.role === 'passenger' && isLocationSharing) {
              await apiClient.updateLocation(currentLocation);
            } else if (user.role === 'driver' && isOnline) {
              // Update driver's bus location
              await apiClient.updateDriverStatus(true, currentLocation);
            }
          } catch (error) {
            console.error('Failed to update location:', error);
          }
        }, 1000); // Update every second for real-time tracking

        return () => {
          clearInterval(updateInterval);
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }
        };
      }
    }
  }, [isLocationSharing, isOnline, locationPermissionGranted, currentLocation, user]);

  const checkSession = async () => {
    try {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error:', sessionError.message);
        setCurrentScreen('onboarding');
        setLoading(false);
        return;
      }
      
      if (currentSession) {
        setSession(currentSession);
        apiClient.setAccessToken(currentSession.access_token);
        
        try {
          // Load user profile
          const profileData = await apiClient.getProfile();
          setUser(profileData.user);
          setCurrentScreen('main');
        } catch (profileError: any) {
          console.warn('Profile load error:', profileError.message);
          // If profile fails, clear session and go to onboarding
          setSession(null);
          apiClient.setAccessToken(null);
          setCurrentScreen('onboarding');
        }
      } else {
        setCurrentScreen('onboarding');
      }
    } catch (error: any) {
      console.warn('Session check error:', error.message || 'Unknown error');
      setCurrentScreen('onboarding');
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const profileData = await apiClient.getProfile();
      setUser(profileData.user);
    } catch (error: any) {
      console.warn('Failed to load user data:', error.message || 'Unknown error');
    }
  };

  const loadDriverData = async () => {
    try {
      const [otpsData, sharesData] = await Promise.all([
        apiClient.getDriverOTPs(),
        apiClient.getLocationShares()
      ]);
      
      setOtps(otpsData.otps || []);
      setLocationShares(sharesData.shares || []);
    } catch (error: any) {
      // Don't log errors if user just switched roles or logged out
      if (error.message && !error.message.includes('Authentication failed')) {
        console.warn('Failed to load driver data:', error.message);
      }
    }
  };

  const loadPassengerData = async () => {
    try {
      const busesData = await apiClient.getBuses();
      setBusLocations(busesData.buses || []);
    } catch (error: any) {
      // Don't log errors if user just switched roles or logged out
      if (error.message && !error.message.includes('Authentication failed')) {
        console.warn('Failed to load passenger data:', error.message);
      }
    }
  };

  const handleCompleteOnboarding = async (userData: { name: string; email: string; password: string; role: UserRole }) => {
    try {
      // Register user
      const registerData = await apiClient.register(userData);
      
      // Sign them in
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });

      if (error) {
        throw new Error('Failed to sign in after registration');
      }

      setSession(signInData.session);
      apiClient.setAccessToken(signInData.session?.access_token || '');
      
      // Load profile
      const profileData = await apiClient.getProfile();
      setUser(profileData.user);
      setCurrentScreen('main');
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Check for duplicate email error
      if (error.message && (error.message.includes('already') || error.message.includes('exists'))) {
        throw new Error('Email already registered');
      } else {
        throw new Error(error.message || 'Failed to create account');
      }
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error('Invalid email or password');
      }

      setSession(data.session);
      apiClient.setAccessToken(data.session?.access_token || '');
      
      const profileData = await apiClient.getProfile();
      setUser(profileData.user);
      setCurrentScreen('main');
      
      toast.success('Signed in successfully!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Invalid email or password');
    }
  };

  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      apiClient.setAccessToken(null);
      setCurrentScreen('onboarding');
      
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    } finally {
      setIsSigningOut(false);
    }
  };

  const generateOTP = async () => {
    try {
      const otpData = await apiClient.generateOTP();
      const newOTP = otpData.otp;
      setOtps([...otps, newOTP]);
      
      toast.success(`OTP Generated: ${newOTP.code}`, {
        description: 'Share this code with passengers to allow location sharing'
      });
    } catch (error: any) {
      console.error('OTP generation error:', error);
      toast.error(error.message || 'Failed to generate OTP');
    }
  };

  const startLocationSharing = async (otpCode: string, busName: string) => {
    try {
      const result = await apiClient.startLocationSharing(otpCode, currentLocation, busName);
      
      setIsLocationSharing(true);
      
      // Immediately refresh bus locations to show the passenger as a bus
      await loadBusLocations();
      
      toast.success('Location sharing started!', {
        description: `Valid for 5 hours. You earned 10 coins! Your bus: ${busName}`
      });
      
      // Refresh user profile to get updated coin balance
      const profileData = await apiClient.getProfile();
      setUser(profileData.user);
      
      // Save state to localStorage for persistence
      localStorage.setItem('bustracker_sharing_state', JSON.stringify({
        isSharing: true,
        busName,
        startTime: new Date().toISOString()
      }));
    } catch (error: any) {
      console.error('Location sharing error:', error);
      toast.error(error.message || 'Failed to start location sharing');
    }
  };

  const stopLocationSharing = async () => {
    try {
      await apiClient.stopLocationSharing();
      setIsLocationSharing(false);
      localStorage.removeItem('bustracker_sharing_state');
      
      // Immediately refresh bus locations to remove the passenger from bus list
      await loadBusLocations();
      
      toast.info('Location sharing stopped');
    } catch (error: any) {
      console.error('Stop sharing error:', error);
      toast.error(error.message || 'Failed to stop location sharing');
    }
  };

  // Check for expired sharing (5 hours)
  useEffect(() => {
    const checkSharingExpiry = () => {
      try {
        const savedState = localStorage.getItem('bustracker_sharing_state');
        if (savedState && isLocationSharing) {
          const state = JSON.parse(savedState);
          const startTime = new Date(state.startTime).getTime();
          const now = new Date().getTime();
          const fiveHours = 5 * 60 * 60 * 1000;
          
          if (now - startTime > fiveHours) {
            stopLocationSharing();
            toast.info('Location sharing stopped automatically after 5 hours');
          }
        }
      } catch (error) {
        console.error('Failed to check sharing expiry:', error);
      }
    };

    // Check every minute
    const interval = setInterval(checkSharingExpiry, 60000);
    checkSharingExpiry(); // Check immediately

    return () => clearInterval(interval);
  }, [isLocationSharing]);

  const toggleDriverOnline = async (busName?: string) => {
    try {
      const newOnlineStatus = !isOnline;
      
      await apiClient.updateDriverStatus(
        newOnlineStatus,
        newOnlineStatus ? currentLocation : undefined,
        busName,
        busName
      );
      
      setIsOnline(newOnlineStatus);
      
      if (newOnlineStatus) {
        toast.success('You are now online', {
          description: `Your bus "${busName}" is now sharing location with passengers`
        });
      } else {
        toast.info('You are now offline', {
          description: 'Location sharing has stopped'
        });
      }
    } catch (error: any) {
      console.error('Driver status update error:', error);
      
      // Check for bus already in use error
      if (error.message && (error.message.includes('already') || error.message.includes('sharing'))) {
        toast.error('This bus location is already being shared', {
          description: 'Try another bus, or if you are in this bus, please confirm with the driver'
        });
      } else {
        toast.error(error.message || 'Failed to update status');
      }
    }
  };

  const stopOTP = async (otpId: string) => {
    try {
      await apiClient.stopOTP(otpId);
      setOtps(otps.filter(otp => otp.id !== otpId));
      toast.success('OTP stopped successfully');
    } catch (error: any) {
      console.error('Stop OTP error:', error);
      toast.error(error.message || 'Failed to stop OTP');
    }
  };

  const stopPassengerSharing = async (shareId: string) => {
    try {
      await apiClient.stopLocationSharing(shareId);
      setLocationShares(locationShares.filter(share => share.id !== shareId));
      toast.success('Passenger sharing stopped');
    } catch (error: any) {
      console.error('Stop passenger sharing error:', error);
      toast.error(error.message || 'Failed to stop passenger sharing');
    }
  };

  const buyCoinPackage = async (amount: number) => {
    try {
      await apiClient.updateCoins(amount, 'add');
      setUser(prev => prev ? { ...prev, coins: (prev.coins || 0) + amount } : null);
      toast.success(`Purchased ${amount} coins!`);
    } catch (error: any) {
      console.error('Coin purchase error:', error);
      toast.error(error.message || 'Failed to purchase coins');
    }
  };

  const handleSendFeedback = () => {
    if (!feedbackType || !feedbackMessage.trim()) {
      toast.error('Please select a feedback type and enter your message');
      return;
    }

    const subject = encodeURIComponent(`BusTracker Feedback - ${feedbackType}`);
    const body = encodeURIComponent(
      `Feedback Type: ${feedbackType}\n\n` +
      `Message:\n${feedbackMessage}\n\n` +
      `---\n` +
      `User: ${user?.name || 'Unknown'}\n` +
      `Email: ${user?.email || 'Unknown'}\n` +
      `Role: ${user?.role || 'Unknown'}\n` +
      `Timestamp: ${new Date().toLocaleString()}`
    );

    // Open email client with pre-filled content
    window.location.href = `mailto:gokulk24cb@psnacet.edu.in?subject=${subject}&body=${body}`;
    
    // Close dialog and reset form
    setShowFeedbackDialog(false);
    setFeedbackType('');
    setFeedbackMessage('');
    
    toast.success('Opening your email client...', {
      description: 'Please send the email to complete your feedback submission'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center p-8 bg-card rounded-xl shadow-lg border">
          <Bus className="h-16 w-16 text-primary mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold mb-2">BusTracker</h2>
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Connecting to services...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render based on current screen
  if (currentScreen === 'onboarding') {
    return (
      <OnboardingFlow 
        onComplete={handleCompleteOnboarding} 
        onSignIn={handleSignIn}
      />
    );
  }

  if (!user || !session) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6" />
            <span className="font-semibold">BusTracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {user.coins || 0}
            </Badge>
            <Badge variant={isOnline && user.role === 'driver' ? 'default' : 'secondary'}>
              {user.role === 'driver' ? (isOnline ? 'Online' : 'Offline') : 'Passenger'}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="pb-32">
          {activeTab === 'home' && (
            <div className="p-4">
              {user.role === 'driver' ? (
                <DriverDashboard
                  isOnline={isOnline}
                  onToggleOnline={toggleDriverOnline}
                  onGenerateOTP={generateOTP}
                  otps={otps}
                  locationShares={locationShares}
                  currentLocation={currentLocation}
                  onStopOTP={stopOTP}
                  onStopPassengerSharing={stopPassengerSharing}
                />
              ) : (
                <PassengerDashboard
                  busLocations={busLocations}
                  onStartLocationSharing={startLocationSharing}
                  isLocationSharing={isLocationSharing}
                  onStopLocationSharing={stopLocationSharing}
                  userCoins={user.coins || 0}
                  currentLocation={currentLocation}
                  onBuyCoinPackage={buyCoinPackage}
                  availableBuses={availableBuses}
                />
              )}
            </div>
          )}
          
          {activeTab === 'map' && (
            <div className="p-4">
              <MapView
                busLocations={busLocations}
                locationShares={locationShares}
                currentLocation={currentLocation}
                userRole={user.role}
                userId={user.id}
                isLocationSharing={isLocationSharing}
                locationPermissionGranted={locationPermissionGranted}
              />
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block mb-1">Name</label>
                    <p className="p-2 bg-muted rounded">{user.name}</p>
                  </div>
                  <div>
                    <label className="block mb-1">Email</label>
                    <p className="p-2 bg-muted rounded">{user.email}</p>
                  </div>
                  <div>
                    <label className="block mb-1">Role</label>
                    <p className="p-2 bg-muted rounded capitalize">{user.role}</p>
                  </div>
                  <div>
                    <label className="block mb-1">Coin Balance</label>
                    <p className="p-2 bg-muted rounded flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      {user.coins || 0} coins
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {user.role === 'driver' 
                        ? 'Earn coins by going online and sharing location' 
                        : 'Earn coins by sharing your location with drivers'
                      }
                    </p>
                  </div>
                  
                  {/* Feedback Button */}
                  <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Feedback
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Feedback</DialogTitle>
                        <DialogDescription>
                          Help us improve BusTracker! Share your feedback, report errors, or suggest new features.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        
                        <div>
                          <Label htmlFor="feedbackType">Feedback Type</Label>
                          <Select value={feedbackType} onValueChange={setFeedbackType}>
                            <SelectTrigger id="feedbackType">
                              <SelectValue placeholder="Select feedback type..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Error Report">Error Report</SelectItem>
                              <SelectItem value="Feature Request">Feature Request</SelectItem>
                              <SelectItem value="Improvement Suggestion">Improvement Suggestion</SelectItem>
                              <SelectItem value="General Feedback">General Feedback</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="feedbackMessage">Your Message</Label>
                          <Textarea
                            id="feedbackMessage"
                            placeholder="Describe your feedback in detail..."
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            rows={6}
                            className="resize-none"
                          />
                        </div>

                        <Button 
                          onClick={handleSendFeedback}
                          className="w-full"
                          disabled={!feedbackType || !feedbackMessage.trim()}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send Feedback
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    onClick={handleSignOut} 
                    variant="outline" 
                    className="w-full"
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing Out...
                      </>
                    ) : (
                      'Sign Out'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* AI Chat Component */}
        <AIChat />

        {/* Bottom Navigation - Always visible */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 shadow-lg">
          <div className="grid grid-cols-3 p-4">
            <Button 
              variant={activeTab === 'home' ? 'default' : 'ghost'} 
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={() => setActiveTab('home')}
            >
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Home</span>
            </Button>
            <Button 
              variant={activeTab === 'map' ? 'default' : 'ghost'} 
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={() => setActiveTab('map')}
            >
              <Bus className="h-4 w-4" />
              <span className="text-xs">Map</span>
            </Button>
            <Button 
              variant={activeTab === 'profile' ? 'default' : 'ghost'} 
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={() => setActiveTab('profile')}
            >
              <Settings className="h-4 w-4" />
              <span className="text-xs">Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}