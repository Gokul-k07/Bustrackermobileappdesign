import React, { useState } from 'react';
import { Bus, MapPin, Shield, ChevronRight, LogIn, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { UserRole } from '../App';
import { ForgotPassword } from './ForgotPassword';
import { apiClient } from '../utils/api';

interface OnboardingFlowProps {
  onComplete: (user: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
}

export function OnboardingFlow({ onComplete, onSignIn }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSignUp, setIsSignUp] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'passenger' as UserRole
  });

  const onboardingSteps = [
    {
      icon: <Bus className="h-16 w-16 text-primary" />,
      title: "Welcome to BusTracker",
      description: "Track buses in real-time and share your location with drivers when needed."
    },
    {
      icon: <MapPin className="h-16 w-16 text-primary" />,
      title: "Live Location Sharing", 
      description: "Drivers share bus locations in real-time. Passengers can share their location using OTP system."
    },
    {
      icon: <Shield className="h-16 w-16 text-primary" />,
      title: "Secure & Fair",
      description: "OTP-based verification ensures secure location sharing. Coin system keeps usage fair for everyone."
    }
  ];

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show signup form
      setCurrentStep(onboardingSteps.length);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      if (isSignUp) {
        if (formData.name.trim() && formData.email.trim() && formData.password.trim()) {
          // Validate email with ValidKit first
          const validation = await apiClient.validateEmail(formData.email);
          if (!validation.valid) {
            setError(validation.message || 'Please use a valid personal email address.');
            setIsLoading(false);
            return;
          }
          
          await onComplete(formData);
        }
      } else {
        if (formData.email.trim() && formData.password.trim()) {
          await onSignIn(formData.email, formData.password);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => setShowForgotPassword(false)}
        onComplete={() => {
          setShowForgotPassword(false);
          setIsSignUp(false);
        }}
      />
    );
  }

  if (currentStep === onboardingSteps.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Bus className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>{isSignUp ? 'Create Your Account' : 'Welcome Back'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSignUp && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setError('');
                  }}
                  className="mt-1"
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setError('');
                }}
                className="mt-1"
              />
              {isSignUp && error && error.toLowerCase().includes('email') && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  setError('');
                }}
                className="mt-1"
              />
              {!isSignUp && (
                <div className="mt-1 text-right">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs p-0 h-auto"
                  >
                    Forgot password?
                  </Button>
                </div>
              )}
            </div>

            {isSignUp && (
              <div>
                <Label htmlFor="role">I am a...</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    variant={formData.role === 'passenger' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, role: 'passenger' })}
                    className="w-full"
                  >
                    Passenger
                  </Button>
                  <Button
                    variant={formData.role === 'driver' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, role: 'driver' })}
                    className="w-full"
                  >
                    Driver
                  </Button>
                </div>
              </div>
            )}
            
            {!isSignUp && error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            <Button 
              onClick={handleSubmit}
              className="w-full"
              disabled={
                isLoading ||
                (isSignUp 
                  ? !formData.name.trim() || !formData.email.trim() || !formData.password.trim()
                  : !formData.email.trim() || !formData.password.trim())
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-sm"
                disabled={isLoading}
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const step = onboardingSteps[currentStep];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 mx-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <Card className="mb-8">
          <CardContent className="pt-6 pb-6 text-center">
            <div className="flex justify-center mb-6">
              {step.icon}
            </div>
            <h2 className="mb-4">{step.title}</h2>
            <p className="text-muted-foreground">
              {step.description}
            </p>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button onClick={handleNext}>
            {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
