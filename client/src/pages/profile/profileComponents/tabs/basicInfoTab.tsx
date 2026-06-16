'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  AppAlertDialogChromeFooter,
  AppAlertDialogFrame,
  AppAlertDialogGradientHeader,
  AppAlertDialogMessage,
} from '@/components/common/appDialogChrome';
import SignatureCanvas from 'react-signature-canvas';
import { User, MapPin, Mail, Phone, Building, Calendar, ShieldCheck } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useAvatarPreview } from '@/hooks/avatarPreview';
import { Shimmer } from '@/components/ui/shimmer';
import { toast } from 'sonner';

interface BasicInfoTabProps {
  isEditing: boolean;
}

export interface BasicInfoTabHandle {
  save: () => Promise<void>;
}

const BasicInfoTab = forwardRef<BasicInfoTabHandle, BasicInfoTabProps>(
  ({ isEditing }, ref) => {
    const { user, loading: userLoading, refetch } = useCurrentUser();
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isTabLoading, setIsTabLoading] = useState(true);
    const [signatureReadyToSave, setSignatureReadyToSave] = useState<string | null>(null);
    const [signatureMarkedDone, setSignatureMarkedDone] = useState(false);
    const [signatureSaved, setSignatureSaved] = useState(false);
    const [showSignaturePreview, setShowSignaturePreview] = useState(false);
    const [canvasKey, setCanvasKey] = useState(0);
    const [canvasRef, setCanvasRef] = useState<SignatureCanvas | null>(null);
    const sigCanvas = useRef<SignatureCanvas>(null);

    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [consentChecks, setConsentChecks] = useState({
      official: false,
      binding: false,
      smsOtp: false,
      terms: false,
    });
    const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
    const consentResolveRef = useRef<(() => void) | null>(null);
    const consentRejectRef = useRef<(() => void) | null>(null);

    // OTP verification state
    const [showOtpDialog, setShowOtpDialog] = useState(false);
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [otpExpiry, setOtpExpiry] = useState(300);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const otpResolveRef = useRef<((success: boolean) => void) | null>(null);
    const otpRejectRef = useRef<((value: boolean) => void) | null>(null);
    const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
      const timer = setTimeout(() => setIsTabLoading(false), 1400);
      return () => clearTimeout(timer);
    }, []);

    // OTP timer effects
    useEffect(() => {
      if (showOtpDialog && otpExpiry > 0) {
        const timer = setInterval(() => {
          setOtpExpiry(prev => {
            if (prev <= 1) {
              setShowOtpDialog(false);
              setOtpCode(['', '', '', '', '', '']);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => clearInterval(timer);
      }
    }, [showOtpDialog]);

    useEffect(() => {
      if (resendCooldown > 0) {
        const timer = setTimeout(
          () => setResendCooldown(resendCooldown - 1),
          1000
        );
        return () => clearTimeout(timer);
      } else {
        setCanResend(true);
      }
    }, [resendCooldown]);

    useEffect(() => {
      if (showOtpDialog) {
        otpInputsRef.current[0]?.focus();
      }
    }, [showOtpDialog]);

    const allConsentsChecked = Object.values(consentChecks).every(Boolean);

    const toggleConsent = (key: keyof typeof consentChecks) =>
      setConsentChecks(prev => ({ ...prev, [key]: !prev[key] }));

    const { pendingFile, clearPreview } = useAvatarPreview();

    const isLoading = userLoading;
    const isImageSignature = (signature?: string | null) =>
      !!signature &&
      (signature.startsWith('data:image') ||
        signature.startsWith('http://') ||
        signature.startsWith('https://'));

    useEffect(() => {
      if (user && !isEditing) {
        setFormData({
          firstName: user.firstName || '',
          middleName: user.middleName || '',
          lastName: user.lastName || '',
          username: user.username || '',
          contactNumber: user.contactNumber || '',
          position: user.position || '',
          unitNo: user.address?.unitNo || '',
          buildingNo: user.address?.buildingNo || '',
          street: user.address?.street || '',
          subdivision: user.address?.subdivision || '',
          barangay: user.address?.barangay || '',
          city: user.address?.city || '',
          province: user.address?.province || '',
          region: user.address?.region || '',
          digitalSignature: user.digitalSignature || '',
        });

        if (isImageSignature(user.digitalSignature)) {
          setSignatureSaved(true);
          setShowSignaturePreview(true);
        } else {
          setSignatureSaved(false);
          setShowSignaturePreview(false);
        }
        setSignatureMarkedDone(false);

        if (sigCanvas.current) {
          sigCanvas.current.clear();
        }
      }
    }, [user, isEditing]);

    useEffect(() => {
      if (!isEditing) return;

      console.log('Edit mode useEffect triggered, digitalSignature:', user?.digitalSignature ? 'YES' : 'NO');

      setShowSignaturePreview(false);
      setSignatureMarkedDone(false);

      if (isImageSignature(user?.digitalSignature)) {
        setSignatureSaved(true);
      } else {
        setSignatureSaved(false);
        setShowSignaturePreview(false);
      }

      const t = window.setTimeout(() => {
        const canvas = canvasRef || sigCanvas.current;
        const existingSignature = user?.digitalSignature;
        console.log('Loading signature onto canvas, hasCanvas:', !!canvas, 'hasSignature:', !!existingSignature);
        if (!canvas) return;
        canvas.clear();
        if (isImageSignature(existingSignature)) {
          try {
            (canvas as any).fromDataURL(existingSignature);
            setSignatureSaved(true);
            console.log('Signature loaded onto canvas successfully');
          } catch (err) {
            console.error('Failed to load initials for editing:', err);
            canvas.clear();
            setSignatureSaved(false);
          }
        } else {
          if (!user?.digitalSignature) setSignatureSaved(false);
        }
      }, 0);

      return () => clearTimeout(t);
    }, [isEditing, user?.digitalSignature]);

    const initialsChanged = (): boolean => {
      const existing = user?.digitalSignature || null;
      return !!(signatureReadyToSave && signatureReadyToSave !== existing);
    };

    const isSettingInitials = (): boolean => {
      const canvas = canvasRef || sigCanvas.current;
      return !!(signatureReadyToSave || (canvas && !canvas.isEmpty()));
    };

    const sendOtp = async () => {
      setIsSendingOtp(true);
      try {
        await api.post('/auth/initials/send-otp', {});
        setOtpExpiry(300);
        setCanResend(false);
        setResendCooldown(60);
        toast.success('OTP sent successfully');
        return true;
      } catch (err: any) {
        toast.error(err.message || 'Failed to send OTP. Please try again.');
        return false;
      } finally {
        setIsSendingOtp(false);
      }
    };

    const verifyOtp = async () => {
      const code = otpCode.join('');
      if (code.length !== 6) {
        toast.error('Please enter a valid 6-digit OTP code.');
        return false;
      }

      setIsVerifyingOtp(true);
      try {
        await api.post('/auth/initials/verify-otp', {
          otp: code,
        });
        return true;
      } catch (err: any) {
        toast.error(err.message || 'Invalid OTP. Please try again.');
        setOtpCode(['', '', '', '', '', '']);
        otpInputsRef.current[0]?.focus();
        return false;
      } finally {
        setIsVerifyingOtp(false);
      }
    };

    const handleOtpChange = (value: string, index: number) => {
      if (!/^\d?$/.test(value)) return;
      const newOtp = [...otpCode];
      newOtp[index] = value;
      setOtpCode(newOtp);
      if (value && index < 5) otpInputsRef.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getInitialsToSave = (): string | null => {
      if (signatureReadyToSave) {
        return signatureReadyToSave;
      }
      const canvas = canvasRef || sigCanvas.current;
      if (canvas && !canvas.isEmpty()) {
        let signatureDataURL: string | null = null;
        try {
          const signatureData = canvas.toData();
          if (signatureData && signatureData.length > 0) {
            // Get actual canvas dimensions from editing canvas
            const canvasEl = canvas.getCanvas();
            const canvasWidth = canvasEl?.width || 500;
            const canvasHeight = canvasEl?.height || 500;

            // Use larger canvas size for saving (double the editing canvas)
            const saveCanvasWidth = canvasWidth * 2;
            const saveCanvasHeight = canvasHeight * 2;

            // Calculate bounding box of the signature
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            signatureData.forEach((stroke: any) => {
              if (stroke && stroke.length > 0) {
                stroke.forEach((point: any) => {
                  if (point.x < minX) minX = point.x;
                  if (point.y < minY) minY = point.y;
                  if (point.x > maxX) maxX = point.x;
                  if (point.y > maxY) maxY = point.y;
                });
              }
            });
            const signatureWidth = maxX - minX;
            const signatureHeight = maxY - minY;
            const padding = 100;
            const availableWidth = saveCanvasWidth - (padding * 2);
            const availableHeight = saveCanvasHeight - (padding * 2);
            const scale = Math.min(availableWidth / signatureWidth, availableHeight / signatureHeight, 1);
            const scaledWidth = signatureWidth * scale;
            const scaledHeight = signatureHeight * scale;
            const offsetX = (saveCanvasWidth - scaledWidth) / 2 - (minX * scale);
            const offsetY = (saveCanvasHeight - scaledHeight) / 2 - (minY * scale);

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              tempCanvas.width = saveCanvasWidth;
              tempCanvas.height = saveCanvasHeight;
              tempCtx.fillStyle = 'white';
              tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              tempCtx.strokeStyle = 'black';
              signatureData.forEach((stroke: any) => {
                if (stroke && stroke.length > 0) {
                  tempCtx.beginPath();
                  tempCtx.lineWidth = 5;
                  tempCtx.lineCap = 'round';
                  tempCtx.lineJoin = 'round';
                  tempCtx.moveTo(stroke[0].x * scale + offsetX, stroke[0].y * scale + offsetY);
                  for (let i = 1; i < stroke.length; i++) {
                    tempCtx.lineTo(
                      stroke[i].x * scale + offsetX,
                      stroke[i].y * scale + offsetY
                    );
                  }
                  tempCtx.stroke();
                }
              });
              signatureDataURL = tempCanvas.toDataURL('image/png');
            }
          }
        } catch {
          /* try fallback */
        }
        if (!signatureDataURL) {
          try {
            const trimmedCanvas = canvas.getTrimmedCanvas();
            if (trimmedCanvas) {
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCanvas.width = 500;
                tempCanvas.height = 500;
                tempCtx.fillStyle = 'white';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(trimmedCanvas, 0, 0);
                signatureDataURL = tempCanvas.toDataURL('image/png');
              }
            }
          } catch {
            /* try fallback */
          }
        }
        if (!signatureDataURL) {
          try {
            const canvasEl = canvas.getCanvas();
            if (canvasEl) {
              const tempCanvas = document.createElement('canvas');
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCanvas.width = canvasEl.width;
                tempCanvas.height = canvasEl.height;
                tempCtx.fillStyle = 'white';
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(canvasEl, 0, 0);
                signatureDataURL = tempCanvas.toDataURL('image/png');
              }
            }
          } catch {
            /* ignore */
          }
        }
        return signatureDataURL && signatureDataURL !== 'data:,'
          ? signatureDataURL
          : null;
      }
      return null;
    };

    const checkInitialsAvailability = async (
      signature: string
    ): Promise<boolean> => {
      try {
        const response = await api.post('/auth/check-initials-availability', {
          digitalSignature: signature,
        });
        return response.available === true;
      } catch (err: any) {
        if (err.status === 409) {
          const conflictingUser = err.conflictingUser;
          toast.error(
            `These initials are already in use by another active account: ${conflictingUser?.firstName} ${conflictingUser?.lastName} (${conflictingUser?.username}). Please choose different initials.`
          );
          return false;
        }
        console.error('Failed to check initials availability:', err);
        return true; // Allow save if check fails to avoid blocking
      }
    };

    const executeSave = async () => {
      if (isSaving) return;
      setIsSaving(true);

      try {
        const payload: any = { ...formData };
        delete payload.digitalSignature;

        // Handle avatar upload
        if (pendingFile) {
          const uploadForm = new FormData();
          uploadForm.append('avatar', pendingFile);
          const { url } = await api.post('/auth/upload/avatar', uploadForm);
          payload.avatarUrl = url;
        }

        if (signatureReadyToSave) {
          payload.digitalSignature = signatureReadyToSave;
          console.log('Using signatureReadyToSave:', signatureReadyToSave ? 'YES' : 'NO');
          console.log('signatureReadyToSave dataURL length:', signatureReadyToSave?.length);
          console.log('signatureReadyToSave first 50 chars:', signatureReadyToSave?.substring(0, 50));
        } else {
          const canvas = canvasRef || sigCanvas.current;
          console.log('Canvas ref exists:', !!canvas);
          console.log('Canvas isEmpty:', canvas?.isEmpty());
          if (canvas && !canvas.isEmpty()) {
            let signatureDataURL: string | null = null;
            try {
              const signatureData = canvas.toData();
              if (signatureData && signatureData.length > 0) {
                // Get actual canvas dimensions from editing canvas
                const canvasEl = canvas.getCanvas();
                const canvasWidth = canvasEl?.width || 500;
                const canvasHeight = canvasEl?.height || 500;

                // Use larger canvas size for saving (double the editing canvas)
                const saveCanvasWidth = canvasWidth * 2;
                const saveCanvasHeight = canvasHeight * 2;

                // Calculate bounding box of the signature
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                signatureData.forEach((stroke: any) => {
                  if (stroke && stroke.length > 0) {
                    stroke.forEach((point: any) => {
                      if (point.x < minX) minX = point.x;
                      if (point.y < minY) minY = point.y;
                      if (point.x > maxX) maxX = point.x;
                      if (point.y > maxY) maxY = point.y;
                    });
                  }
                });
                const signatureWidth = maxX - minX;
                const signatureHeight = maxY - minY;
                const padding = 100;
                const availableWidth = saveCanvasWidth - (padding * 2);
                const availableHeight = saveCanvasHeight - (padding * 2);
                const scale = Math.min(availableWidth / signatureWidth, availableHeight / signatureHeight, 1);
                const scaledWidth = signatureWidth * scale;
                const scaledHeight = signatureHeight * scale;
                const offsetX = (saveCanvasWidth - scaledWidth) / 2 - (minX * scale);
                const offsetY = (saveCanvasHeight - scaledHeight) / 2 - (minY * scale);

                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                  tempCanvas.width = saveCanvasWidth;
                  tempCanvas.height = saveCanvasHeight;
                  tempCtx.fillStyle = 'white';
                  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                  tempCtx.strokeStyle = 'black';
                  signatureData.forEach((stroke: any) => {
                    if (stroke && stroke.length > 0) {
                      tempCtx.beginPath();
                      tempCtx.lineWidth = 5;
                      tempCtx.lineCap = 'round';
                      tempCtx.lineJoin = 'round';
                      tempCtx.moveTo(stroke[0].x * scale + offsetX, stroke[0].y * scale + offsetY);
                      for (let i = 1; i < stroke.length; i++) {
                        tempCtx.lineTo(
                          stroke[i].x * scale + offsetX,
                          stroke[i].y * scale + offsetY
                        );
                      }
                      tempCtx.stroke();
                    }
                  });
                  signatureDataURL = tempCanvas.toDataURL('image/png');
                }
              }
            } catch {
              /* try fallback */
            }
            if (!signatureDataURL) {
              try {
                const trimmedCanvas = canvas.getTrimmedCanvas();
                if (trimmedCanvas) {
                  const tempCanvas = document.createElement('canvas');
                  const tempCtx = tempCanvas.getContext('2d');
                  if (tempCtx) {
                    tempCanvas.width = 500;
                    tempCanvas.height = 500;
                    tempCtx.fillStyle = 'white';
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tempCtx.drawImage(trimmedCanvas, 0, 0);
                    signatureDataURL = tempCanvas.toDataURL('image/png');
                  }
                }
              } catch {
                /* try fallback */
              }
            }
            if (!signatureDataURL) {
              try {
                const canvasEl = canvas.getCanvas();
                if (canvasEl) {
                  const tempCanvas = document.createElement('canvas');
                  const tempCtx = tempCanvas.getContext('2d');
                  if (tempCtx) {
                    tempCanvas.width = canvasEl.width;
                    tempCanvas.height = canvasEl.height;
                    tempCtx.fillStyle = 'white';
                    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                    tempCtx.drawImage(canvasEl, 0, 0);
                    signatureDataURL = tempCanvas.toDataURL('image/png');
                  }
                }
              } catch {
                /* ignore */
              }
            }
            if (signatureDataURL && signatureDataURL !== 'data:,') {
              payload.digitalSignature = signatureDataURL;
              console.log('Captured signature from canvas:', signatureDataURL.substring(0, 50) + '...');
            }
          }
        }

        console.log('Final payload digitalSignature:', payload.digitalSignature ? 'YES' : 'NO');
        console.log('Payload keys:', Object.keys(payload));

        await api.patch('/auth/profile', payload);

        console.log('Profile saved, refetching user data...');

        await refetch();

        console.log('User data refetched, new digitalSignature:', user?.digitalSignature ? 'YES' : 'NO');

        clearPreview();

        const didSaveInitials = !!(signatureReadyToSave ||
          ((canvasRef || sigCanvas.current) && !(canvasRef || sigCanvas.current)?.isEmpty()));

        if (didSaveInitials) {
          setSignatureSaved(true);
          setSignatureMarkedDone(false);
          setSignatureReadyToSave(null);
          setShowSignaturePreview(true);
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to save profile');
        throw err;
      } finally {
        setIsSaving(false);
      }
    };

    const handleSave = async () => {
      if (isSettingInitials() && initialsChanged()) {
        setConsentChecks({ official: false, binding: false, smsOtp: false, terms: false });
        pendingSaveRef.current = executeSave;
        setShowConsentDialog(true);
        return new Promise<void>((resolve, reject) => {
          consentResolveRef.current = () => resolve();
          consentRejectRef.current = () => reject(new Error('Cancelled by user'));
        });
      }
      await executeSave();
    };

    useImperativeHandle(ref, () => ({ save: handleSave }));

    if (isTabLoading || isLoading || !user) {
      return (
        <Card className="shadow-xl rounded-2xl overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md">
                <Shimmer className="h-8 w-8 rounded bg-white/20" />
              </div>
              <div>
                <Shimmer className="h-8 w-48 rounded bg-white/20" />
                <Shimmer className="h-5 w-96 rounded mt-2 bg-white/20" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-4 sm:p-6 lg:space-y-10 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Shimmer className="h-5 w-32 rounded" />
                  <Shimmer className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <Separator className="bg-gray-300" />
            <div>
              <Shimmer className="h-7 w-56 rounded-lg mb-6" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Shimmer className="h-4 w-24 rounded" />
                    <Shimmer className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            </div>
            <Separator className="bg-gray-300" />
            <div className="space-y-4">
              <Shimmer className="h-6 w-48 rounded" />
              <Shimmer className="h-24 w-full rounded-xl" />
            </div>
            <Separator className="bg-gray-300" />
            <div className="space-y-8">
              <Shimmer className="h-7 w-64 rounded-lg" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between">
                    <Shimmer className="h-5 w-48 rounded" />
                    <Shimmer className="h-5 w-16 rounded" />
                  </div>
                  <Shimmer className="h-3 w-full rounded-full" />
                </div>
              ))}
              <Shimmer className="h-10 w-40 rounded-xl ml-auto" />
            </div>
            <Separator className="bg-gray-300" />
            <div className="space-y-4">
              <Shimmer className="h-7 w-48 rounded-lg" />
              <Shimmer className="h-64 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
      <Card className="shadow-lg rounded-2xl overflow-hidden border-0">
        <CardHeader className="bg-gradient-to-r from-red-600 to-red-800 p-4 text-white sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-md">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold sm:text-2xl">
                Basic Information
              </CardTitle>
              <p className="text-red-100 text-sm opacity-90">
                Manage your basic profile information and digital initials
              </p>
            </div>
          </div>
        </CardHeader>

        <Separator className="bg-gray-100" />

        <CardContent className="space-y-8 p-4 sm:p-6 lg:space-y-10 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            <div>
              <Label>First Name</Label>
              {isEditing ? (
                <Input
                  value={formData.firstName || ''}
                  onChange={e =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-xl font-medium mt-1">
                  {formData.firstName || '—'}
                </p>
              )}
            </div>
            <div>
              <Label>Middle Name</Label>
              {isEditing ? (
                <Input
                  value={formData.middleName || ''}
                  onChange={e =>
                    setFormData({ ...formData, middleName: e.target.value })
                  }
                  className="mt-1"
                  placeholder="Optional"
                />
              ) : (
                <p className="text-xl font-medium mt-1">
                  {formData.middleName || '—'}
                </p>
              )}
            </div>
            <div>
              <Label>Last Name</Label>
              {isEditing ? (
                <Input
                  value={formData.lastName || ''}
                  onChange={e =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-xl font-medium mt-1">
                  {formData.lastName || '—'}
                </p>
              )}
            </div>
            <div>
              <Label>Username</Label>
              {isEditing ? (
                <Input
                  value={formData.username || ''}
                  onChange={e =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-xl font-medium mt-1">
                  {formData.username || '—'}
                </p>
              )}
            </div>
            <div>
              <Label>Position</Label>
              {isEditing ? (
                <Input
                  value={formData.position || ''}
                  onChange={e =>
                    setFormData({ ...formData, position: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-xl font-medium mt-1">
                  {formData.position || '—'}
                </p>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" /> Contact Number
              </Label>
              {isEditing ? (
                <Input
                  value={formData.contactNumber || ''}
                  onChange={e =>
                    setFormData({ ...formData, contactNumber: e.target.value })
                  }
                  className="mt-1"
                />
              ) : (
                <p className="text-xl font-medium mt-1">
                  {formData.contactNumber || '—'}
                </p>
              )}
            </div>
            <div>
              <Label>Employee ID</Label>
              <p className="mt-1 text-lg font-mono sm:text-xl">{user.employeeId || '—'}</p>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </Label>
              <p className="text-xl font-medium mt-1">{user.email}</p>
            </div>
            <div>
              <Label>Department</Label>
              <p className="text-xl font-medium mt-1">
                {user.department || '—'}
              </p>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Building className="w-4 h-4" /> Company
              </Label>
              <p className="text-xl font-medium mt-1">{user.company || '—'}</p>
            </div>
            <div className="md:col-span-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Joined Date
              </Label>
              <p className="text-xl font-medium mt-1">
                {user.createdAt
                  ? format(new Date(user.createdAt), 'MMMM d, yyyy')
                  : '—'}
              </p>
            </div>
          </div>

          <Separator className="bg-gray-300" />

          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-700">
              <MapPin className="w-7 h-7" /> Permanent Address
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
              {[
                'unitNo',
                'buildingNo',
                'street',
                'subdivision',
                'barangay',
                'city',
                'province',
                'region',
              ].map(field => (
                <div key={field}>
                  <Label className="text-sm text-gray-600 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData[field] || ''}
                      onChange={e =>
                        setFormData({ ...formData, [field]: e.target.value })
                      }
                      className="mt-1"
                      placeholder={field === 'unitNo' ? 'e.g. 12A' : ''}
                    />
                  ) : (
                    <p className="font-medium mt-1">{formData[field] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-gray-300" />

          {/* <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="w-6 h-6" /> Emergency Contact
          </h3>
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-800">Michael Johnson</AlertTitle>
            <AlertDescription className="text-gray-700">
              Relationship: Spouse · +63 998 777 8888 · Same address
            </AlertDescription>
          </Alert>
        </div>

        <Separator className="bg-gray-300" />

     
        <div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-red-700">
            <TrendingUp className="w-6 h-6" /> Performance Review (2024)
          </h3>
          <div className="space-y-6">
            {[
              { label: "Quality of Work", value: 92 },
              { label: "Team Collaboration", value: 88 },
              { label: "Initiative & Innovation", value: 95 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between mb-2">
                  <span>{item.label}</span>
                  <span className="font-bold text-red-600">{item.value}%</span>
                </div>
                <Progress value={item.value} className="h-3 [&>div]:bg-red-600" />
              </div>
            ))}
            <div className="text-right">
              <Badge className="bg-red-100 text-red-700 text-lg px-6 py-2 font-semibold">
                Overall: Excellent
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-300" /> */}

          <div>
            <h3 className="text-xl font-semibold mb-3 text-red-700">
              Digital Initials
            </h3>
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-4 space-y-2">
              <p className="text-sm text-gray-700 leading-relaxed">
                Your digital initials serve as your <span className="font-semibold text-red-700">official electronic signature</span> on all forms generated and processed within this system. Once set, your initials will appear on every form you approve, submit, or sign.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Initials are legally binding within this system and tied to your verified account.</li>
                <li>Every use of your initials is secured and confirmed via <span className="font-medium text-gray-700">SMS OTP / MFA verification</span>.</li>
                <li>Any form bearing your initials is considered <span className="font-medium text-gray-700">official and authenticated</span>.</li>
              </ul>
              <p className="text-xs text-red-600 font-medium pt-1">
                See: <span className="underline underline-offset-2">Policy — Digital Initials and SMS OTP / MFA Verification</span> for full details.
              </p>
            </div>

            {!isEditing && !signatureSaved && (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
                <p className="text-gray-500">
                  No initials on file. Click &quot;Edit Profile&quot; to add
                  your digital initials.
                </p>
              </div>
            )}

            {!isEditing && signatureSaved && showSignaturePreview && (
              <div className="border-2 border-red-300 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="p-4 bg-gray-50 border-b">
                  <p className="text-sm text-red-700 font-medium">
                    ✓ Digital initials saved
                  </p>
                </div>
                <div className="p-6 bg-white flex items-center justify-center min-h-[80px]">
                  {isImageSignature(user?.digitalSignature) && (
                    <img
                      src={user.digitalSignature || undefined}
                      alt="Digital Initials"
                      className="max-w-full h-32 object-contain mx-auto"
                    />
                  )}
                </div>
              </div>
            )}

            {isEditing && (
              <div className="rounded-xl border-2 border-red-200 overflow-hidden bg-white shadow-sm">
                <div className={signatureMarkedDone ? 'pointer-events-none opacity-50' : ''}>
                  <SignatureCanvas
                    key={canvasKey}
                    ref={(ref) => {
                      sigCanvas.current = ref;
                      setCanvasRef(ref);
                    }}
                    penColor="black"
                    minWidth={2.5}
                    maxWidth={5}
                    canvasProps={{ className: 'w-full h-[500px] bg-gray-50' }}
                  />
                </div>
                <div className="flex flex-col gap-3 border-t bg-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
                  <p className="text-sm text-gray-600">
                    {signatureReadyToSave
                      ? 'Initials captured and ready to save!'
                      : signatureMarkedDone
                        ? 'Initials marked as done!'
                        : 'Draw your initials above'}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCanvasKey(prev => prev + 1);
                        setCanvasRef(null);
                        setSignatureSaved(false);
                        setSignatureMarkedDone(false);
                        setSignatureReadyToSave(null);
                      }}
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                          console.log('Mark as Done clicked, signatureReadyToSave before:', signatureReadyToSave ? 'YES' : 'NO');
                          try {
                            if (!(canvasRef || sigCanvas.current)) {
                              toast.error('Canvas not ready. Please try again.');
                              return;
                            }
                            if ((canvasRef || sigCanvas.current)?.isEmpty()) {
                              toast.error('Please draw your initials before clicking Mark as Done.');
                              return;
                            }
                            console.log('Canvas is not empty, proceeding to capture');
                            setTimeout(async () => {
                              try {
                                let signatureDataURL: string | null = null;
                                const canvas = canvasRef || sigCanvas.current;
                                if (!canvas) {
                                  toast.error('Canvas not ready. Please try again.');
                                  return;
                                }
                                console.log('Capturing signature from canvas, canvasRef:', !!canvasRef, 'sigCanvas.current:', !!sigCanvas.current);
                                try {
                                  const signatureData = canvas.toData();
                                  console.log('toData result:', signatureData ? 'YES' : 'NO', 'stroke count:', signatureData?.length);
                                  if (signatureData && signatureData.length > 0) {
                                    // Get actual canvas dimensions from editing canvas
                                    const canvasEl = canvas.getCanvas();
                                    const canvasWidth = canvasEl?.width || 500;
                                    const canvasHeight = canvasEl?.height || 500;
                                    console.log('Canvas dimensions:', { canvasWidth, canvasHeight });

                                    // Use larger canvas size for saving (double the editing canvas)
                                    const saveCanvasWidth = canvasWidth * 2;
                                    const saveCanvasHeight = canvasHeight * 2;
                                    console.log('Save canvas dimensions:', { saveCanvasWidth, saveCanvasHeight });

                                    // Calculate bounding box of the signature
                                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                    signatureData.forEach((stroke: any) => {
                                      if (stroke && stroke.length > 0) {
                                        stroke.forEach((point: any) => {
                                          if (point.x < minX) minX = point.x;
                                          if (point.y < minY) minY = point.y;
                                          if (point.x > maxX) maxX = point.x;
                                          if (point.y > maxY) maxY = point.y;
                                        });
                                      }
                                    });
                                    const signatureWidth = maxX - minX;
                                    const signatureHeight = maxY - minY;
                                    const padding = 100;
                                    const availableWidth = saveCanvasWidth - (padding * 2);
                                    const availableHeight = saveCanvasHeight - (padding * 2);
                                    const scale = Math.min(availableWidth / signatureWidth, availableHeight / signatureHeight, 1);
                                    const scaledWidth = signatureWidth * scale;
                                    const scaledHeight = signatureHeight * scale;
                                    const offsetX = (saveCanvasWidth - scaledWidth) / 2 - (minX * scale);
                                    const offsetY = (saveCanvasHeight - scaledHeight) / 2 - (minY * scale);

                                    console.log('Signature bounds:', { minX, minY, maxX, maxY, signatureWidth, signatureHeight, scale, offsetX, offsetY });

                                    const tempCanvas = document.createElement('canvas');
                                    const tempCtx = tempCanvas.getContext('2d');
                                    if (tempCtx) {
                                      tempCanvas.width = saveCanvasWidth;
                                      tempCanvas.height = saveCanvasHeight;
                                      tempCtx.fillStyle = 'white';
                                      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                                      tempCtx.strokeStyle = 'black';
                                      signatureData.forEach((stroke: any) => {
                                        if (stroke && stroke.length > 0) {
                                          tempCtx.beginPath();
                                          tempCtx.lineWidth = 5;
                                          tempCtx.lineCap = 'round';
                                          tempCtx.lineJoin = 'round';
                                          tempCtx.moveTo(stroke[0].x * scale + offsetX, stroke[0].y * scale + offsetY);
                                          for (let i = 1; i < stroke.length; i++) {
                                            tempCtx.lineTo(
                                              stroke[i].x * scale + offsetX,
                                              stroke[i].y * scale + offsetY
                                            );
                                          }
                                          tempCtx.stroke();
                                        }
                                      });
                                      signatureDataURL = tempCanvas.toDataURL('image/png');
                                      console.log('Signature captured successfully, dataURL length:', signatureDataURL?.length);
                                    }
                                  } else {
                                    console.log('No signature data found');
                                  }
                                } catch (err) {
                                  console.error('toData failed:', err);
                                  /* try fallback */
                                }
                                if (!signatureDataURL) {
                                  console.log('Primary capture failed, trying fallback methods');
                                  try {
                                    const trimmedCanvas = canvas.getTrimmedCanvas();
                                    if (trimmedCanvas) {
                                      const tempCanvas = document.createElement('canvas');
                                      const tempCtx = tempCanvas.getContext('2d');
                                      if (tempCtx) {
                                        tempCanvas.width = 500;
                                        tempCanvas.height = 500;
                                        tempCtx.fillStyle = 'white';
                                        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                                        tempCtx.drawImage(trimmedCanvas, 0, 0);
                                        signatureDataURL = tempCanvas.toDataURL('image/png');
                                        console.log('Signature captured via trimmedCanvas');
                                      }
                                    }
                                  } catch {
                                    /* try fallback */
                                  }
                                }
                                if (!signatureDataURL) {
                                  console.log('TrimmedCanvas failed, trying getCanvas');
                                  try {
                                    const canvasEl = canvas.getCanvas();
                                    if (canvasEl) {
                                      const tempCanvas = document.createElement('canvas');
                                      const tempCtx = tempCanvas.getContext('2d');
                                      if (tempCtx) {
                                        tempCanvas.width = canvasEl.width;
                                        tempCanvas.height = canvasEl.height;
                                        tempCtx.fillStyle = 'white';
                                        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                                        tempCtx.drawImage(canvasEl, 0, 0);
                                        signatureDataURL = tempCanvas.toDataURL('image/png');
                                        console.log('Signature captured via getCanvas');
                                      }
                                    }
                                  } catch {
                                    /* ignore */
                                  }
                                }
                                if (signatureDataURL && signatureDataURL !== 'data:,') {
                                  setSignatureReadyToSave(signatureDataURL);
                                  setSignatureMarkedDone(true);
                                  toast.success('Initials marked as done! Click Save to save your profile.');
                                  console.log('signatureReadyToSave set successfully');
                                } else {
                                  toast.error('Failed to capture initials. Please try again.');
                                  console.error('Failed to capture signature, signatureDataURL is null or invalid');
                                }
                              } catch (err) {
                                console.error('Mark as Done error:', err);
                                toast.error('Failed to mark initials as done. Please try again.');
                              }
                            }, 100);
                          } catch (err) {
                            console.error('Mark as Done outer error:', err);
                            toast.error('Failed to mark initials as done. Please try again.');
                          }
                        }}
                        disabled={signatureMarkedDone}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Mark as Done
                      </Button>
                    </div>
                  </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2 italic">
              {!isEditing && signatureSaved
                ? 'Your digital initials are saved on your profile.'
                : !isEditing
                  ? 'No initials added yet.'
                  : signatureReadyToSave
                      ? 'Initials will be saved when you save profile changes.'
                      : signatureMarkedDone
                        ? 'Click Save on the profile page to store your initials.'
                        : 'Draw your initials, tap Mark as Done, then save your profile.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Digital Initials Consent Dialog */}
      <AlertDialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <AppAlertDialogFrame className="max-w-lg">
          <AppAlertDialogGradientHeader title="Digital Initials — Consent & Agreement" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600 leading-relaxed">
              Before saving your digital initials, please read and acknowledge each of the following statements. All boxes must be checked to proceed.
            </AlertDialogDescription>
          </AppAlertDialogMessage>

          <div className="space-y-4 py-4 px-6">
            {/* Consent 1 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={consentChecks.official}
                onCheckedChange={() => toggleConsent('official')}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I understand that my digital initials will serve as my <span className="font-semibold text-red-700">official electronic signature</span> on all forms generated and processed within this system, and will appear on every form I approve, submit, or sign.
              </span>
            </label>

            {/* Consent 2 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={consentChecks.binding}
                onCheckedChange={() => toggleConsent('binding')}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I acknowledge that my initials are <span className="font-semibold text-gray-900">legally binding</span> within this system, tied to my verified account, and that any form bearing my initials is considered <span className="font-semibold text-gray-900">official and authenticated</span>.
              </span>
            </label>

            {/* Consent 3 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={consentChecks.smsOtp}
                onCheckedChange={() => toggleConsent('smsOtp')}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I understand that every use of my initials is secured and confirmed via <span className="font-semibold text-gray-900">SMS OTP / MFA verification</span>, and that I am solely responsible for maintaining the confidentiality of my account and OTP codes.
              </span>
            </label>

            {/* Consent 4 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={consentChecks.terms}
                onCheckedChange={() => toggleConsent('terms')}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to the <span className="font-semibold text-red-700 underline underline-offset-2">Policy — Digital Initials and SMS OTP / MFA Verification</span>, and I accept all terms, conditions, and legal implications of setting a digital initial within this system.
              </span>
            </label>
          </div>

          {!allConsentsChecked && (
            <p className="text-xs text-red-500 text-center font-medium px-6 pb-2">
              Please check all boxes above to enable the Confirm button.
            </p>
          )}

          <AppAlertDialogChromeFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConsentDialog(false);
                pendingSaveRef.current = null;
                if (consentRejectRef.current) {
                  consentRejectRef.current();
                  consentRejectRef.current = null;
                }
                // Clear OTP refs if they exist
                if (otpRejectRef.current) {
                  otpRejectRef.current = null;
                }
                if (otpResolveRef.current) {
                  otpResolveRef.current = null;
                }
              }}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!allConsentsChecked}
              onClick={async () => {
                setShowConsentDialog(false);
                // Send OTP and show OTP dialog
                const otpSent = await sendOtp();
                if (otpSent) {
                  setOtpCode(['', '', '', '', '', '']);
                  setShowOtpDialog(true);
                } else {
                  // If OTP failed, show consent dialog again
                  setShowConsentDialog(true);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              I Agree &amp; Save Initials
            </AlertDialogAction>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>

      {/* OTP Verification Dialog */}
      <AlertDialog open={showOtpDialog} onOpenChange={(open) => {
        if (!open) {
          setShowOtpDialog(false);
          setOtpCode(['', '', '', '', '', '']);
        }
      }}>
        <AppAlertDialogFrame className="max-w-md">
          <AppAlertDialogGradientHeader title="OTP SMS Verification" />
          <AppAlertDialogMessage>
            <AlertDialogDescription className="text-base text-gray-600 leading-relaxed">
              OTP SMS Verification has been sent to your registered mobile number: <span className="font-semibold text-gray-900">{user?.contactNumber || 'N/A'}</span>
            </AlertDialogDescription>
          </AppAlertDialogMessage>

          <div className="space-y-4 py-4 px-6">
            <div>
              <Label className="text-sm text-gray-600 mb-2 block">
                Enter the 6-digit code sent to{' '}
                <strong>{user?.contactNumber || 'your registered mobile number'}</strong>
              </Label>
              <p className="text-sm text-gray-700 mt-2">
                Expires in:{' '}
                <strong className="text-red-600">{formatTime(otpExpiry)}</strong>
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {otpCode.map((_, i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={otpCode[i]}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  className="w-12 h-12 text-center text-lg font-bold bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500"
                  disabled={isVerifyingOtp || otpExpiry === 0}
                  ref={el => {
                    otpInputsRef.current[i] = el;
                  }}
                />
              ))}
            </div>
          </div>

          <AppAlertDialogChromeFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowOtpDialog(false);
                setOtpCode(['', '', '', '', '', '']);
                // Reject the promise to cancel the save
                if (otpRejectRef.current) {
                  otpRejectRef.current(false);
                  otpRejectRef.current = null;
                }
                // Show consent dialog again if cancelled
                setShowConsentDialog(true);
              }}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                const resent = await sendOtp();
                if (resent) {
                  setOtpCode(['', '', '', '', '', '']);
                }
              }}
              disabled={!canResend || isSendingOtp || otpExpiry === 0}
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              {resendCooldown > 0 ? (
                <>Resend in {resendCooldown}s</>
              ) : (
                <>Resend OTP</>
              )}
            </Button>
            <Button
              onClick={async () => {
                const verified = await verifyOtp();
                if (verified) {
                  setShowOtpDialog(false);
                  setOtpCode(['', '', '', '', '', '']);
                  // Execute the save after successful verification
                  if (pendingSaveRef.current) {
                    try {
                      await pendingSaveRef.current();
                    } catch (err: any) {
                      // Propagate the error to the parent component
                      if (consentRejectRef.current) {
                        consentRejectRef.current();
                        consentRejectRef.current = null;
                      }
                      throw err;
                    }
                    pendingSaveRef.current = null;
                  }
                  if (consentResolveRef.current) {
                    consentResolveRef.current();
                    consentResolveRef.current = null;
                  }
                }
              }}
              disabled={
                isVerifyingOtp ||
                !otpCode.every(d => d) ||
                otpExpiry === 0
              }
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {isVerifyingOtp ? 'Verifying...' : 'Verify'}
            </Button>
          </AppAlertDialogChromeFooter>
        </AppAlertDialogFrame>
      </AlertDialog>
      </>
    );
  }
);

BasicInfoTab.displayName = 'BasicInfoTab';
export default BasicInfoTab;
