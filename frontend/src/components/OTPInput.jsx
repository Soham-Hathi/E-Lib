import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const OTPInput = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [previewOtp, setPreviewOtp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    // Extract email and optional previewOtp from navigation state or URL query
    const stateEmail = location.state?.email;
    const queryEmail = new URLSearchParams(location.search).get('email');
    const stateOtp = location.state?.previewOtp;
    const queryOtp = new URLSearchParams(location.search).get('otp');

    if (stateEmail) {
      setEmail(stateEmail);
    } else if (queryEmail) {
      setEmail(queryEmail);
    }

    const code = stateOtp || queryOtp;
    if (code) {
      setPreviewOtp(code);
      setOtp(String(code));
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is missing. Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/user/verify-otp`, {
        otp: otp.trim(),
        email: email.trim().toLowerCase(),
      });

      const { token } = response.data;
      // Navigate to resetpassword route with verified token
      navigate(`/resetpassword?token=${token}`);
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim() || resending) return;
    setResending(true);
    setResendNotice('');
    setError('');

    try {
      const res = await axios.post(`${API_BASE_URL}/user/emailotp`, {
        email: email.trim().toLowerCase(),
      });
      setResendNotice(res.data.message || 'A fresh OTP has been sent.');
      if (res.data.previewOtp) {
        setPreviewOtp(res.data.previewOtp);
        setOtp(String(res.data.previewOtp));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg dark:bg-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Enter OTP Code</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            Please enter the 6-digit code sent to your email address.
          </p>
        </div>

        {/* Dev Mode Banner with one-click autofill */}
        {previewOtp && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
            <div>
              <span className="font-bold">⚡ Current Dev Code:</span>{' '}
              <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                {previewOtp}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOtp(String(previewOtp));
                setError('');
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs transition"
            >
              Autofill
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {resendNotice && (
          <div
            role="status"
            className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300"
          >
            {resendNotice}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email (editable in case missing) */}
          <div className="mb-4">
            <label className="block text-gray-700 text-xs font-semibold mb-1 dark:text-gray-200" htmlFor="otp-email">
              Account Email
            </label>
            <input
              type="email"
              id="otp-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 text-sm focus:outline-none focus:border-blue-500"
              placeholder="name@example.com"
            />
          </div>

          {/* OTP Code Input */}
          <div className="mb-6">
            <label className="block text-gray-700 text-xs font-semibold mb-1 dark:text-gray-200" htmlFor="otp-code">
              6-Digit OTP Code
            </label>
            <input
              type="text"
              id="otp-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ''));
                if (error) setError('');
              }}
              placeholder="e.g. 123456"
              autoFocus
              required
              className="w-full px-3 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg text-gray-800 dark:text-white dark:bg-gray-600 dark:border-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button
            type="submit"
            id="verify-otp-btn"
            disabled={loading}
            className={`w-full font-bold py-2.5 px-4 rounded-lg focus:outline-none transition shadow ${
              loading
                ? 'bg-blue-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Verifying...' : 'Verify OTP & Continue'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            id="resend-otp-btn"
            onClick={handleResendOtp}
            disabled={resending || !email.trim()}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {resending ? 'Sending fresh code...' : "Didn't receive or code expired? Resend Fresh OTP"}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 text-center">
          <Link to="/requestresetpassword" className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
            &larr; Request with a different email
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OTPInput;
