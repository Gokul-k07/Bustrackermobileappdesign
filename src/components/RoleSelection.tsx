import React from 'react';
import { Bus, Users, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { UserRole } from '../App';

interface RoleSelectionProps {
  onRoleSelect: (role: UserRole) => void;
}

export function RoleSelection({ onRoleSelect }: RoleSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="mb-2">Choose Your Role</h1>
          <p className="text-muted-foreground">
            Select how you'll be using BusTracker today
          </p>
        </div>

        <div className="space-y-4">
          {/* Driver Option */}
          <Card 
            className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 hover:border-primary"
            onClick={() => onRoleSelect('driver')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Bus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Continue as Driver</h3>
                    <p className="text-sm text-muted-foreground">
                      Share bus location and manage passengers
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Passenger Option */}
          <Card 
            className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 hover:border-primary"
            onClick={() => onRoleSelect('passenger')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Continue as Passenger</h3>
                    <p className="text-sm text-muted-foreground">
                      Track buses and share your location
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            You can change your role anytime in settings
          </p>
        </div>
      </div>
    </div>
  );
}