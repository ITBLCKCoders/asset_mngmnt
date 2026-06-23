'use client';

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PhoneInput from 'react-phone-number-input/react-hook-form';
import 'react-phone-number-input/style.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCw } from 'lucide-react';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Company, Department, Position } from '@/types/assets';

import {
  OTHER_COMPANY_ID,
  registerSchema,
  type RegisterForm,
} from '@/pages/registration/registerSchema';
import { RequiredLabel } from '@/pages/registration/registerHelpers';

type AuthScene = 'login' | 'register';

const AUTH_TRANSITION_MS = 900;

const TRANSITION_EASING: [number, number, number, number] = [0.65, 0, 0.35, 1];

const AUTH_BACKDROP: Record<AuthScene, { red: string; white: string }> = {
  login: {
    red: 'M760 -120 C620 130 555 315 720 455 C900 608 610 715 510 900 L1440 900 L1440 -120 Z',
    white:
      'M835 -120 C700 128 640 318 805 455 C980 600 705 720 610 900 L1440 900 L1440 -120 Z',
  },
  register: {
    red: 'M680 -120 C820 130 885 315 720 455 C540 608 830 715 930 900 L0 900 L0 -120 Z',
    white:
      'M605 -120 C740 128 800 318 635 455 C460 600 735 720 830 900 L0 900 L0 -120 Z',
  },
};

function AuthBackdrop({ scene }: { scene: AuthScene }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <motion.path
        fill="#EE1D25"
        initial={false}
        animate={{ d: AUTH_BACKDROP[scene].red }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING }}
      />
      <motion.path
        fill="#ffffff"
        initial={false}
        animate={{ d: AUTH_BACKDROP[scene].white }}
        transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING, delay: 0.08 }}
      />
    </svg>
  );
}

function GhostLoginPanel({ scene }: { scene: AuthScene }) {
  return (
    <motion.div
      className="pointer-events-none absolute right-[6vw] top-1/2 z-10 hidden w-[27rem] -translate-y-1/2 lg:block"
      initial={false}
      animate={{
        opacity: scene === 'register' ? 0.12 : 0.04,
        x: scene === 'register' ? 0 : 96,
        y: scene === 'register' ? 0 : -16,
        scale: scene === 'register' ? 1 : 0.94,
        rotate: scene === 'register' ? 0 : 1,
      }}
      transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING }}
      aria-hidden="true"
    >
      <div className="mx-auto mb-8 h-16 w-56 rounded-sm border border-red-600/20" />
      <div className="space-y-4">
        <div className="h-9 rounded-sm border border-red-500/10 bg-white/[0.12]" />
        <div className="h-9 rounded-sm border border-red-500/10 bg-white/[0.12]" />
      </div>
      <div className="mx-auto mt-5 h-9 w-36 rounded-sm bg-red-700/35" />
      <div className="mx-auto mt-5 h-8 w-72 rounded-sm bg-white/[0.12]" />
      <div className="mx-auto mt-3 h-8 w-72 rounded-sm bg-white/[0.12]" />
    </motion.div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<RegisterForm | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpExpiry, setOtpExpiry] = useState(600);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingCompanyData, setLoadingCompanyData] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [scene, setScene] = useState<AuthScene>('register');
  const [isRouting, setIsRouting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      contactNumber: '+63',
      company_id: '',
      department_id: '',
      position: '',
    },
  });

  const watchedCompanyId = watch('company_id');
  const [userDigits, setUserDigits] = useState('');

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [companiesRes] = await Promise.all([
          // Public projection (id, name, prefix, logo_url) — no PII.
          api.get('/companies/public'),
        ]);
        setCompanies(companiesRes.companies || companiesRes.data || []);
      } catch (error) {
        console.error('Failed to fetch options:', error);
        toast.error('Failed to load form options');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (!watchedCompanyId) {
      setValue('employeeNumber', '');
      return;
    }
    const selectedCompany = companies.find(
      (c: Company) => c.id === watchedCompanyId
    );
    if (!selectedCompany) {
      setValue('employeeNumber', '');
      return;
    }
    if (selectedCompany.id === OTHER_COMPANY_ID) {
      setValue('employeeNumber', '');
      return;
    }
    const prefix = selectedCompany.prefix;
    const clean = userDigits.slice(0, 8);
    let formatted = prefix + '-' + clean.padStart(4, '0').slice(0, 4);
    if (clean.length > 4) formatted += '-' + clean.slice(4).padStart(4, '0');
    else if (clean.length > 0)
      formatted += '-' + clean.slice(0, 3).padStart(3, '0');
    else formatted += '-000';
    setValue('employeeNumber', formatted, { shouldValidate: true });
  }, [watchedCompanyId, userDigits, setValue, companies]);

  useEffect(() => {
    if (!watchedCompanyId || watchedCompanyId === OTHER_COMPANY_ID) {
      setDepartments([]);
      setAllPositions([]);
      setPositions([]);
      if (!watchedCompanyId) {
        setValue('department_id', '');
        setValue('position', '');
      }
      return;
    }

    const fetchCompanyData = async () => {
      try {
        setLoadingCompanyData(true);
        setValue('department_id', '');
        setValue('position', '');
        setPositions([]);
        setDepartments([]);
        setAllPositions([]);

        const [departmentsRes, positionsRes] = await Promise.all([
          api.get('/departments?companyId=' + watchedCompanyId),
          api.get('/positions?companyId=' + watchedCompanyId),
        ]);
        setDepartments(departmentsRes.departments);
        const positionsList = positionsRes.positions || positionsRes.data || [];
        setAllPositions(positionsList);
      } catch (error) {
        console.error('Failed to fetch company data:', error);
        toast.error('Failed to load department and position options');
        setDepartments([]);
        setAllPositions([]);
      } finally {
        setLoadingCompanyData(false);
      }
    };
    fetchCompanyData();
  }, [watchedCompanyId]);

  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setUserDigits(raw);
    setValue('employeeNumber', raw, { shouldValidate: true });
  };

  const handleDepartmentChange = async (departmentId: string) => {
    setValue('department_id', departmentId);
    setValue('position', '');

    if (!departmentId) {
      setPositions([]);
      return;
    }

    try {
      setLoadingPositions(true);
      const filteredPositions = allPositions.filter(
        (p: Position) => String(p.department_id) === String(departmentId)
      );
      setPositions(filteredPositions);
    } catch (error: any) {
      console.error('Failed to filter positions:', error);
      toast.error('Failed to load position options');
      setPositions([]);
    } finally {
      setLoadingPositions(false);
    }
  };

  const onSubmit = handleSubmit(async data => {
    // Validate employee number format
    if (
      watchedCompanyId &&
      watchedCompanyId !== OTHER_COMPANY_ID &&
      ![7, 8].includes(userDigits.length)
    ) {
      toast.error('Employee number must be 7 or 8 digits');
      return;
    }

    if (watchedCompanyId === OTHER_COMPANY_ID && userDigits.length === 0) {
      toast.error('Employee number is required');
      return;
    }

    setPendingFormData(data);
    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating your account...', {
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
    });
    try {
      await api.post('/auth/register', {
        ...data,
      });
      localStorage.setItem('pendingVerificationChannel', 'email');
      localStorage.setItem('pendingVerificationEmail', data.email);
      localStorage.setItem('pendingVerificationContact', data.contactNumber);
      localStorage.setItem('otpExpiryTime', (Date.now() + 10 * 60 * 1000).toString());
      setOtpExpiry(600);
      toast.success('Account created!', {
        id: loadingToast,
        icon: <CheckCircle2 className="w-5 h-5" />,
      });
      setShowVerification(true);
      inputsRef.current[0]?.focus();
    } catch (e: any) {
      toast.error(e.message || 'Registration failed', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  });

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
    if (newOtp.every(d => d)) handleVerifyOtp(newOtp.join(''));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!pendingFormData) return;

    setStatus('loading');
    const loadingToast = toast.loading('Verifying OTP...');
    try {
      await api.post('/auth/verify-otp', {
        // channel: selectedOtpChannel,
        email: pendingFormData.email,
        // contactNumber: pendingFormData.contactNumber,
        otp: code,
      });
      localStorage.removeItem('pendingVerificationChannel');
      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationContact');
      localStorage.removeItem('otpExpiryTime');
      toast.success(
        // selectedOtpChannel === 'sms'
        //   ? 'Phone number verified successfully!'
        //   : 'Email verified successfully!',
        'Email verified successfully!',
        {
          id: loadingToast,
          icon: <CheckCircle2 className="w-5 h-5" />,
          description: 'You can now log in with your credentials.',
        }
      );
      setStatus('success');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (e: any) {
      toast.error(e.message || 'Invalid OTP', { id: loadingToast });
      setStatus('error');
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setStatus('idle');
    }
  };

  const handleResendOtp = async () => {
    if (!pendingFormData || !canResend) return;

    setCanResend(false);
    setResendCooldown(60);
    localStorage.setItem('otpExpiryTime', (Date.now() + 10 * 60 * 1000).toString());
    setOtpExpiry(600);

    const loadingToast = toast.loading('Sending new OTP...');
    try {
      await api.post('/auth/resend-otp', {
        // channel: selectedOtpChannel,
        email: pendingFormData.email,
        // contactNumber: pendingFormData.contactNumber,
      });
      toast.success('New OTP sent!', {
        id: loadingToast,
        icon: <RotateCw className="w-5 h-5" />,
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to resend', { id: loadingToast });
      setCanResend(true);
      setResendCooldown(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (showVerification) {
      const timer = setInterval(() => {
        setOtpExpiry(prev => {
          if (prev <= 1) {
            localStorage.removeItem('pendingVerificationChannel');
            localStorage.removeItem('pendingVerificationEmail');
            localStorage.removeItem('pendingVerificationContact');
            localStorage.removeItem('otpExpiryTime');
            toast.error('OTP expired. Please register again.', {
              duration: 5000,
            });
            setShowVerification(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showVerification]);

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

  const goBack = () => {
    if (isRouting) return;
    setIsRouting(true);
    setScene('login');
    setTimeout(() => {
      navigate('/login');
    }, AUTH_TRANSITION_MS);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black md:overflow-y-auto">
      <AuthBackdrop scene={scene} />
      <GhostLoginPanel scene={scene} />

      {isRouting && (
        <motion.div
          className="absolute inset-0 z-30 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, ease: TRANSITION_EASING }}
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, transparent 25%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      )}

      <form
        onSubmit={onSubmit}
        className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 py-8 lg:justify-start lg:pl-[7vw] lg:pr-[36vw]"
      >
        <motion.div
          className="w-full max-w-xl"
          initial={false}
          animate={{
            opacity: scene === 'register' ? 1 : 0,
            x: scene === 'register' ? 0 : 180,
            y: scene === 'register' ? 0 : 24,
            scale: scene === 'register' ? 1 : 0.96,
          }}
          transition={{ duration: AUTH_TRANSITION_MS / 1000, ease: TRANSITION_EASING }}
        >
          <div
            className={`flex flex-col items-center rounded-lg bg-white/95 p-6 shadow-xl backdrop-blur-sm lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none ${
              showVerification
                ? 'overflow-visible'
                : 'max-h-[92vh] overflow-y-auto'
            }`}
            >
              <div className="w-full min-w-0 flex flex-col items-center">
            <div className="mb-6 w-52 drop-shadow-md sm:w-64 lg:w-[29rem] lg:drop-shadow-lg">
              <img src={logo} alt="Blackcoders" className="h-auto w-full" />
            </div>

            <AnimatePresence mode="wait">
            {showVerification ? (
              <motion.div
                key="verify-otp"
                className="w-full space-y-4"
                initial={{ opacity: 0, x: 72, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -72, scale: 0.98 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <h2 className="text-2xl font-bold text-black text-center">
                  Verify Email
                </h2>
                <p className="text-sm text-gray-600 text-center">
                  Enter the 6-digit code sent to{' '}
                  <strong>
                    {pendingFormData?.email}
                  </strong>
                </p>
                <p className="text-sm text-gray-500 text-center">
                  Expires in:{' '}
                  <strong className="text-red-600">{formatTime(otpExpiry)}</strong>
                </p>
                <div className="flex justify-center gap-2">
                  {otp.map((_, i) => (
                    <Input
                      key={i}
                      type="text"
                      maxLength={1}
                      value={otp[i]}
                      onChange={e => handleChange(e.target.value, i)}
                      onKeyDown={e => handleKeyDown(e, i)}
                      className="w-12 h-12 text-center text-lg font-bold bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500"
                      disabled={status === 'loading' || otpExpiry === 0}
                      ref={el => {
                        inputsRef.current[i] = el;
                      }}
                    />
                  ))}
                </div>

                {status === 'success' && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center gap-3 py-4"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-600" />
                    <p className="text-lg font-medium text-green-800">
                      Verified! Redirecting...
                    </p>
                  </motion.div>
                )}

                {status === 'error' && (
                  <div className="text-center text-sm text-red-600">
                    Invalid or expired OTP.
                  </div>
                )}

                <div className="flex flex-col items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => handleVerifyOtp(otp.join(''))}
                    disabled={
                      status === 'loading' || !otp.every(d => d) || otpExpiry === 0
                    }
                   className="w-full max-w-xs bg-red-600 hover:bg-white hover:text-red-600 hover:border-red-600 text-white font-medium text-sm py-2 border-2 border-transparent"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={
                      !canResend ||
                      status === 'loading' ||
                      otpExpiry === 0
                    }
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? (
                      <>Resend in {resendCooldown}s</>
                    ) : (
                      <>Resend OTP</>
                    )}
                  </button>
                </div>
              </motion.div>

            ) : (
              <motion.div
                key="registration-fields"
                className="w-full space-y-3"
                initial={{ opacity: 0, x: -72, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -72, scale: 0.98 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-black text-sm">
                    <RequiredLabel>First Name</RequiredLabel>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    {...register('firstName')}
                    className="bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-600">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-black text-sm">
                    <RequiredLabel>Last Name</RequiredLabel>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    {...register('lastName')}
                    className="bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-600">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-black text-sm">
                    <RequiredLabel>Username</RequiredLabel>
                  </Label>
                  <Input
                    id="username"
                    placeholder="johndoe123"
                    {...register('username')}
                    className="bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                  />
                  {errors.username && (
                    <p className="text-xs text-red-600">
                      {errors.username.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactNumber" className="text-black text-sm">
                    <RequiredLabel>Contact Number</RequiredLabel>
                  </Label>
                  <PhoneInput
                    control={control}
                    name="contactNumber"
                    international
                    defaultCountry="PH"
                    placeholder="+63 912 345 6789"
                    className="flex h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-red-500 focus-within:border-transparent"
                  />
                  {errors.contactNumber && (
                    <p className="text-xs text-red-600">
                      {errors.contactNumber.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-black text-sm">
                  <RequiredLabel>Email</RequiredLabel>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-black text-sm">
                    <RequiredLabel>Password</RequiredLabel>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="********"
                      {...register('password')}
                      className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-black text-sm"
                  >
                    <RequiredLabel>Confirm Password</RequiredLabel>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="********"
                      {...register('confirmPassword')}
                      className="bg-white/90 backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="company_id" className="text-black text-sm">
                    <RequiredLabel>Company</RequiredLabel>
                  </Label>
                  <Controller
                    name="company_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        disabled={loadingOptions}
                      >
                        <SelectTrigger className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500">
                          <SelectValue
                            placeholder={
                              loadingOptions ? 'Loading...' : 'Select company'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {companies.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No companies available
                            </div>
                          ) : (
                            companies.map(c => (
                              <SelectItem
                                key={c.id}
                                value={c.id}
                                className="hover:bg-gray-200"
                              >
                                {c.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.company_id && (
                    <p className="text-xs text-red-600">
                      {errors.company_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="department_id" className="text-black text-sm">
                    <RequiredLabel>Department</RequiredLabel>
                  </Label>
                  <Controller
                    name="department_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={value => handleDepartmentChange(value)}
                        value={field.value ?? ''}
                        disabled={loadingOptions || loadingCompanyData || !watchedCompanyId}
                      >
                        <SelectTrigger className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500">
                          <SelectValue
                            placeholder={
                              loadingOptions || loadingCompanyData
                                ? 'Loading...'
                                : !watchedCompanyId
                                  ? 'Select company first'
                                  : departments.length === 0
                                    ? 'No departments available'
                                    : 'Select department'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {!watchedCompanyId ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              Select company first
                            </div>
                          ) : departments.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              {loadingCompanyData ? 'Loading...' : 'No departments available'}
                            </div>
                          ) : (
                            departments.map(d => (
                              <SelectItem
                                key={d.departmentID}
                                value={d.departmentID}
                                className="hover:bg-gray-200"
                              >
                                {d.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.department_id && (
                    <p className="text-xs text-red-600">
                      {errors.department_id.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="position" className="text-black text-sm">
                    <RequiredLabel>Position</RequiredLabel>
                  </Label>
                  <Controller
                    name="position"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                        disabled={loadingPositions || loadingCompanyData || !watch('department_id')}
                      >
                        <SelectTrigger className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500">
                          <SelectValue
                            placeholder={
                              loadingPositions
                                ? 'Loading...'
                                : watch('department_id')
                                  ? positions.length === 0
                                    ? 'No positions for this department'
                                    : 'Select position'
                                  : 'Select department first'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {positions.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              {watch('department_id')
                                ? 'No positions available'
                                : 'Select department first'}
                            </div>
                          ) : (
                            positions.map(p => (
                              <SelectItem
                                key={p.positionID}
                                value={p.name}
                                className="hover:bg-gray-200"
                              >
                                {p.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.position && (
                    <p className="text-xs text-red-600">
                      {errors.position.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="employeeNumber"
                    className="text-black text-sm"
                  >
                    <RequiredLabel>Employee Number</RequiredLabel>
                  </Label>
                  <div className="flex items-center gap-1">
                    <span className="inline-block min-w-10 text-sm font-medium text-gray-700">
                      {watchedCompanyId && watchedCompanyId !== OTHER_COMPANY_ID
                        ? companies.find(
                            (c: Company) => c.id === watchedCompanyId
                          )?.prefix + '-'
                        : '---'}
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder={
                        watchedCompanyId === OTHER_COMPANY_ID
                          ? 'Enter employee number'
                          : '000-0000 or 000-000'
                      }
                      value={userDigits
                        .replace(/^(\d{0,4})(\d{0,4})$/, '$1-$2')
                        .replace(/-+$/, '')}
                      onChange={handleEmployeeChange}
                      disabled={!watchedCompanyId}
                      className="flex-1 bg-white backdrop-blur-sm border-2 border-gray-300 focus:ring-2 focus:ring-red-500 py-2 text-sm"
                      maxLength={9}
                    />
                  </div>
                  {errors.employeeNumber && (
                    <p className="text-xs text-red-600">
                      {errors.employeeNumber.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full max-w-xs bg-red-600 hover:!bg-white hover:!text-red-600 hover:!border-red-600 text-white font-medium text-sm py-2 border-2 border-transparent"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={goBack}
                  disabled={isRouting}
                  variant="ghost"
                  className="w-full max-w-xs text-red-600 hover:bg-red-600 hover:text-white text-sm py-2 shadow-none"
                >
                  Already have an account?
                </Button>
              </div>
            </motion.div>
            )}
            </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
}

// RequiredLabel is imported from `./registration/registerHelpers`.
