import React, { useState, useEffect } from 'react';
import { Bus, Loader2, Mail, RefreshCw, Shield, Square, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { AdminStats, apiClient } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { User } from '../App';

interface AdminDashboardProps {
  currentUser: User;
}

interface AdminManagedUser extends User {
  isOnline?: boolean;
  sharingMode?: 'driver-trip' | 'passenger-sharing' | 'offline';
  liveBusName?: string | null;
  activeShareCount?: number;
  sharingStartedAt?: string | null;
}

const EMPTY_STATS: AdminStats = {
  total: 0,
  drivers: 0,
  passengers: 0,
  admins: 0,
  onlineUsers: 0,
  activeDrivers: 0,
  activePassengers: 0,
};

export function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stoppingUserId, setStoppingUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAllUsers();
      setUsers(response.users || []);
      setStats(response.stats || EMPTY_STATS);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users', {
        description: error.message || 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
    toast.success('User list refreshed');
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string | null | undefined) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'driver':
        return 'default';
      case 'passenger':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSharingBadge = (user: AdminManagedUser) => {
    if (user.sharingMode === 'driver-trip') {
      return <Badge variant="default">Driver trip live</Badge>;
    }

    if (user.sharingMode === 'passenger-sharing') {
      return <Badge variant="secondary">Passenger sharing</Badge>;
    }

    return <Badge variant="outline">Offline</Badge>;
  };

  const handleStopSharing = async (user: AdminManagedUser) => {
    try {
      setStoppingUserId(user.id);
      await apiClient.stopUserSharing(user.id);
      await loadUsers();
      toast.success(`Stopped sharing for ${user.name}`);
    } catch (error: any) {
      console.error('Failed to stop sharing:', error);
      toast.error(error.message || 'Failed to stop sharing');
    } finally {
      setStoppingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor all registered users
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.drivers}</div>
            <div className="text-xs text-muted-foreground">Drivers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.passengers}</div>
            <div className="text-xs text-muted-foreground">Passengers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.admins}</div>
            <div className="text-xs text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.onlineUsers}</div>
            <div className="text-xs text-muted-foreground">Online Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <div className="text-xs text-muted-foreground">Driver Trips Live</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats.activePassengers}</div>
            <div className="text-xs text-muted-foreground">Passenger Shares Live</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
        <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Users
          </CardTitle>
          <CardDescription>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users match your search' : 'No users registered yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg border ${
                    user.id === currentUser.id ? 'bg-primary/5 border-primary' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{user.name}</p>
                        {user.id === currentUser.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <p className="truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role || 'No role'}
                        </Badge>
                        {getSharingBadge(user)}
                        {typeof user.coins === 'number' && (
                          <span className="text-xs text-muted-foreground">
                            {user.coins} coins
                          </span>
                        )}
                      </div>
                      {user.liveBusName && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Bus className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            {user.sharingMode === 'driver-trip' ? 'Current trip' : 'Shared bus'}: {user.liveBusName}
                          </span>
                        </div>
                      )}
                      {typeof user.activeShareCount === 'number' && user.activeShareCount > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Active passenger shares: {user.activeShareCount}
                        </p>
                      )}
                    </div>
                    {user.isOnline && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStopSharing(user)}
                        disabled={stoppingUserId === user.id}
                        className="shrink-0"
                      >
                        {stoppingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            Stop Sharing
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {user.sharingStartedAt && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Active since {new Date(user.sharingStartedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
