import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { toast } from 'sonner@2.0.3';

interface ForgotPasswordProps {
  onBack: () => void;
  onComplete: () => void;
}

export function ForgotPassword({ onBack, onComplete }: ForgotPasswordProps) {
  const [step, setStep] = useState<'email' | 'verify' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);

  const handleSendCode = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    const loadingToast = toast.loading('Sending verification code...');

    try {
      const response = await fetch(`${window.location.origin}/functions/v1/make-server-8b08beda/send-reset-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);
      
      if (response.ok) {
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        setExpiryTime(expiry);
        setCodeSent(true);
        setStep('verify');
        toast.success('Verification code sent!', {
          description: 'Check your email for the code (valid for 5 minutes)'
        });
      } else {
        toast.error(data.error || 'Failed to send verification code', {
          description: 'Please check your email and try again'
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to send verification code');
    }
  };

  const handleVerifyCode = () => {
    if (!verificationCode || verificationCode.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    if (expiryTime && new Date() > expiryTime) {
      toast.error('Verification code has expired', {
        description: 'Please request a new code'
      });
      return;
    }

    // In real implementation, verify the code with the backend
    // For now, simulate verification
    toast.success('Code verified successfully');
    setStep('reset');
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    const loadingToast = toast.loading('Resetting password...');

    try {
      const response = await fetch(`${window.location.origin}/functions/v1/make-server-8b08beda/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode, newPassword }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success('Password reset successfully!', {
          description: 'You can now sign in with your new password'
        });
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Reset Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'email' && (
            <>
              <div className="text-center mb-4">
                <Mail className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a verification code
                </p>
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                />
              </div>

              <Button onClick={handleSendCode} className="w-full">
                Send Verification Code
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <div className="text-center mb-4">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to {email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Code expires in 5 minutes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('email')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyCode}
                  className="flex-1"
                  disabled={verificationCode.length < 6}
                >
                  Verify Code
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleSendCode}
                className="w-full text-sm"
              >
                Didn't receive code? Resend
              </Button>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="text-center mb-4">
                <Lock className="h-12 w-12 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Enter your new password
                </p>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                />
              </div>

              <Button
                onClick={handleResetPassword}
                className="w-full"
                disabled={!newPassword || !confirmPassword}
              >
                Reset Password
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
