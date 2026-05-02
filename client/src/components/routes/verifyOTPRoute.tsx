import { Navigate, useLocation } from 'react-router-dom';
import VerifyOTP from '@/pages/verifyOTP';

export default function VerifyOtpRoute() {
  const channel =
    (localStorage.getItem('pendingVerificationChannel') as 'email' | 'sms') ||
    'email';
  const email = localStorage.getItem('pendingVerificationEmail');
  const contactNumber = localStorage.getItem('pendingVerificationContact');
  const location = useLocation();

  const hasIdentifier = channel === 'sms' ? !!contactNumber : !!email;

  return hasIdentifier ? (
    <VerifyOTP />
  ) : (
    <Navigate to="/register" replace state={{ from: location }} />
  );
}
