'use client';

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCw } from 'lucide-react';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/Blackcoders-Black.png';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Company, Department, Position } from '@/types/assets';

import {
  OTHER_COMPANY_ID,
  registerSchema,
  type RegisterForm,
} from '@/pages/registration/registerSchema';
import {
  RequiredLabel,
  GoogleIcon,
  MicrosoftIcon,
} from '@/pages/registration/registerHelpers';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedOtpChannel, setSelectedOtpChannel] = useState<'email' | 'sms'>('email');
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
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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
        const [companiesRes, departmentsRes, positionsRes] = await Promise.all([
          // Public projection (id, name, prefix, logo_url) — no PII.
          api.get('/companies/public'),
          api.get('/departments'),
          api.get('/positions'),
        ]);
        setCompanies(companiesRes.companies || companiesRes.data || []);
        setDepartments(departmentsRes.departments);
        const positionsList = positionsRes.positions || positionsRes.data || [];
        setAllPositions(positionsList);
        setPositions([]);
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
      userDigits.length !== 8
    ) {
      toast.error('Employee number must be 8 digits');
      return;
    }

    if (watchedCompanyId === OTHER_COMPANY_ID && userDigits.length === 0) {
      toast.error('Employee number is required');
      return;
    }

    setPendingFormData(data);
    setShowOtpModal(true);
  });

  const handleOtpChannelConfirm = async () => {
    if (!pendingFormData) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading('Creating your account...', {
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
    });
    try {
      await api.post('/auth/register', {
        ...pendingFormData,
        otpChannel: selectedOtpChannel,
      });
      localStorage.setItem('pendingVerificationChannel', selectedOtpChannel);
      localStorage.setItem('pendingVerificationEmail', pendingFormData.email);
      localStorage.setItem('pendingVerificationContact', pendingFormData.contactNumber);
      localStorage.setItem('otpExpiryTime', (Date.now() + 10 * 60 * 1000).toString());
      setOtpExpiry(600);
      toast.success('Account created!', {
        id: loadingToast,
        icon: <CheckCircle2 className="w-5 h-5" />,
      });
      setShowOtpModal(false);
      setShowVerification(true);
      inputsRef.current[0]?.focus();
    } catch (e: any) {
      toast.error(e.message || 'Registration failed', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        channel: selectedOtpChannel,
        email: pendingFormData.email,
        contactNumber: pendingFormData.contactNumber,
        otp: code,
      });
      localStorage.removeItem('pendingVerificationChannel');
      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationContact');
      localStorage.removeItem('otpExpiryTime');
      toast.success(
        selectedOtpChannel === 'sms'
          ? 'Phone number verified successfully!'
          : 'Email verified successfully!',
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
        channel: selectedOtpChannel,
        email: pendingFormData.email,
        contactNumber: pendingFormData.contactNumber,
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
    setIsAnimating(true);
    setTimeout(() => {
      navigate(-1);
    }, 1000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black flex items-center justify-center p-4 md:overflow-y-auto">
      <div className="absolute inset-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 320 1440"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            fill="#EE1D25"
            d="M90,1550 C-50,850 380,-390 70,0 L320,0 L320,1440 Z"
            transform="translate(320,1440) scale(-1,-1)"
            initial={{ d: "M90,1550 C-50,850 380,-390 70,0 L320,0 L320,1440 Z" }}
            animate={isAnimating ? { d: "M-10,1550 C-150,850 280,-390 -30,0 L220,0 L220,1440 Z" } : { d: "M90,1550 C-50,850 380,-390 70,0 L320,0 L320,1440 Z" }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
          <motion.path
            fill="#ffffff"
            d="M75,1490 C-20,690 480,-430 10,0 L31220,0 L2280,1420 Z"
            transform="translate(320,1440) scale(-1,-1)"
            initial={{ d: "M75,1490 C-20,690 480,-430 10,0 L31220,0 L2280,1420 Z" }}
            animate={isAnimating ? { d: "M-25,1490 C-120,690 380,-430 -90,0 L31100,0 L2160,1420 Z" } : { d: "M75,1490 C-20,690 480,-430 10,0 L31220,0 L2280,1420 Z" }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>
      </div>
      <form
        onSubmit={onSubmit}
        className="absolute inset-0 flex items-center justify-center p-4 lg:left-[-2%] lg:top-1/3 lg:-translate-y-1/2 lg:translate-x-1/4 lg:w-full lg:max-w-xl lg:p-0 lg:mr-8 lg:mt-24 z-10"
      >
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 1, scale: 1 }}
          animate={isAnimating ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-6 shadow-xl lg:bg-transparent lg:backdrop-blur-none lg:rounded-none lg:p-0 lg:shadow-none flex flex-col items-center max-h-[90vh] overflow-y-auto md:max-h-none md:overflow-visible">
            <div className="w-40 h-auto mb-4 drop-shadow-md sm:w-48 md:w-56 lg:absolute lg:right-1/2 lg:-top-20 lg:translate-x-1/2 lg:w-[500px] lg:mb-0 lg:drop-shadow-lg lg:pointer-events-none">
              <img src={logo} alt="Blackcoders" className="w-full h-auto" />
            </div>

            {showVerification ? (
              <div className="w-full space-y-4 lg:pt-60">
                <h2 className="text-2xl font-bold text-black text-center">
                  Verify {selectedOtpChannel === 'sms' ? 'Phone Number' : 'Email'}
                </h2>
                <p className="text-sm text-gray-600 text-center">
                  Enter the 6-digit code sent to{' '}
                  <strong>
                    {selectedOtpChannel === 'sms'
                      ? pendingFormData?.contactNumber
                      : pendingFormData?.email}
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
                    onClick={() => handleVerifyOtp(otp.join(''))}
                    disabled={
                      status === 'loading' || !otp.every(d => d) || otpExpiry === 0
                    }
                    className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2"
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
              </div>
            ) : (
              <div className="w-full space-y-3 lg:pt-60">
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
                        disabled={loadingOptions}
                      >
                        <SelectTrigger className="bg-white border-2 border-gray-300 focus:ring-2 focus:ring-red-500">
                          <SelectValue
                            placeholder={
                              loadingOptions
                                ? 'Loading...'
                                : 'Select department'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {departments.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">
                              No departments available
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
                        disabled={loadingPositions || !watch('department_id')}
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
                          : '000-0000'
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
                  className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2"
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
                  className="w-full max-w-xs text-red-600 hover:bg-red-600 hover:text-white text-sm py-2 shadow-none"
                >
                  Already have an account?
                </Button>
              </div>
            </div>
            )}
          </div>
        </motion.div>
      </form>

      {/* OTP Channel Selection Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-black mb-4">
              Choose OTP Verification Method
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              How would you like to receive your verification code?
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedOtpChannel('email')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedOtpChannel === 'email'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedOtpChannel === 'email'
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedOtpChannel === 'email' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-black">Email OTP</div>
                    <div className="text-xs text-gray-500">Receive code via email</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOtpChannel('sms')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                  selectedOtpChannel === 'sms'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedOtpChannel === 'sms'
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedOtpChannel === 'sms' && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-black">SMS OTP</div>
                    <div className="text-xs text-gray-500">Receive code via SMS</div>
                  </div>
                </div>
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOtpChannelConfirm}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// GoogleIcon, MicrosoftIcon, RequiredLabel are imported from
// `./registration/registerHelpers`.
