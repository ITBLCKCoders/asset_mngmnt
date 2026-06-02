'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CheckCircle2, Shield, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { Shimmer } from '@/components/ui/shimmer';

export default function SetupMFA() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [totp, setTotp] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'success'>('init');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/mfa/setup');
      setQrCode(response.qrCode);
      setSecret(response.manualEntryKey);
      setStep('scan');
      toast.success('QR code generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start MFA setup');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (totp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/mfa/verify-setup', { token: totp });
      setBackupCodes(response.backupCodes);
      setStep('success');
      toast.success('MFA enabled successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Invalid code. Please try again.');
      setTotp('');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Secret copied to clipboard');
  };

  const copyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      toast.success('Backup codes copied to clipboard');
    }
  };

  const downloadBackupCodes = () => {
    if (backupCodes) {
      const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mfa-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup codes downloaded');
    }
  };

  if (step === 'init') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Enable Two-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>You'll need to:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Scan a QR code with your authenticator app</li>
                <li>Enter the 6-digit code to verify</li>
                <li>Save your backup codes in a safe place</li>
              </ol>
            </div>
            <Button onClick={startSetup} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Setting up...
                </>
              ) : (
                'Start Setup'
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Scan QR Code</CardTitle>
            <CardDescription>
              Use Google Authenticator, Microsoft Authenticator, or any TOTP app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {qrCode && (
              <div className="flex flex-col items-center space-y-4">
                <img src={qrCode} alt="MFA QR Code" className="w-48 h-48" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Can't scan? Use this code:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                      {secret}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copySecret}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-600 mt-1">Copied!</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Enter the 6-digit code from your app:</p>
              <Input
                placeholder="000000"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
            <Button onClick={verifySetup} disabled={totp.length !== 6 || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify & Enable'
              )}
            </Button>
            <Button variant="outline" onClick={() => setStep('init')} className="w-full">
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
          >
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </motion.div>
          <CardTitle className="text-2xl">MFA Enabled!</CardTitle>
          <CardDescription>
            Save these backup codes in a safe place
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive" className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              These codes can be used to recover your account if you lose access to your authenticator app. 
              They will only be shown once!
            </AlertDescription>
          </Alert>
          
          {backupCodes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code 
                    key={index} 
                    className="bg-muted p-2 rounded text-center font-mono text-sm"
                  >
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={copyBackupCodes} variant="outline" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
          
          <Button onClick={() => navigate('/settings')} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
