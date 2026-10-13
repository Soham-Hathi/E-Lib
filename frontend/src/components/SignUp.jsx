import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3000';

const SignUp = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  // Verification Pending Screen State
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [verificationData, setVerificationData] = useState({
    maskedEmail: '',
    email: '',
    previewUrl: null,
  });

  // Resend Cooldown
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState({ text: '', type: '' });

  // Cooldown countdown timer
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const validateInputs = () => {
    const errors = {};
    if (!formData.fullname.trim() || formData.fullname.trim().length < 2) {
      errors.fullname = 'Full name must be at least 2 characters.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field-level and global errors when the user edits
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
    if (alreadyVerified) setAlreadyVerified(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    setError('');
    setAlreadyVerified(false);

    try {
      const response = await axios.post(`${API_BASE_URL}/user/signup`, {
        fullname: formData.fullname.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (response.data.status === 'verification_pending') {
        setIsVerificationPending(true);
        setVerificationData({
          maskedEmail: response.data.maskedEmail || formData.email,
          email: response.data.email || formData.email,
          previewUrl: response.data.previewUrl || null,
        });
        setCooldown(response.data.cooldownSeconds || 60);
      } else {
        // Fallback for immediate success
        navigate('/login?verified=true');
      }
    } catch (err) {
      console.error('Signup error:', err);
      const res = err.response;
      if (res && res.status === 409) {
        // Account already exists and is verified
        setAlreadyVerified(true);
        setError(res.data.message || 'An account with this email already exists. Please log in instead.');
      } else if (res && res.data && res.data.message) {
        setError(res.data.message);
      } else {
        setError('Unable to complete registration. Please check your network connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMessage({ text: '', type: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/user/resend-verification`, {
        email: verificationData.email,
      });

      setResendMessage({
        text: response.data.message || 'Verification email resent successfully!',
        type: 'success',
      });
      setCooldown(60);
      if (response.data.previewUrl) {
        setVerificationData((prev) => ({
          ...prev,
          previewUrl: response.data.previewUrl,
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend verification email.';
      setResendMessage({ text: msg, type: 'error' });
      if (err.response?.data?.cooldownSeconds) {
        setCooldown(err.response.data.cooldownSeconds);
      }
    } finally {
      setResending(false);
    }
  };

  // State 1: Verification Pending Confirmation Screen
  if (isVerificationPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 px-4 py-8">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-xl dark:bg-gray-700 text-center transition-all">
          {/* Animated Mail Icon Badge */}
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Check Your Email</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            We sent a verification link to:
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 py-2 px-4 rounded-lg font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 mb-6 inline-block">
            {verificationData.maskedEmail}
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed mb-6">
            Please check your inbox (and spam or junk folder) and click the link to activate your E-Library account.
          </p>

          {/* Local Development Quick-Link Preview */}
          {verificationData.previewUrl && (
            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-left">
              <div className="flex items-center text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                <span>⚡ Dev Preview Link</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                Running in local mode without SMTP. Click below to simulate opening the verification link:
              </p>
              <a
                href={verificationData.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded transition"
              >
                Open Verification Link &rarr;
              </a>
            </div>
          )}

          {/* Resend Feedback Alerts */}
          {resendMessage.text && (
            <div
              className={`p-3 rounded-lg text-xs mb-4 ${
                resendMessage.type === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {resendMessage.text}
            </div>
          )}

          {/* Resend Verification Button with Cooldown */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              id="resend-verification-btn"
              onClick={handleResendVerification}
              disabled={cooldown > 0 || resending}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition focus:outline-none ${
                cooldown > 0 || resending
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow'
              }`}
            >
              {resending
                ? 'Sending fresh email...'
                : cooldown > 0
                ? `Resend Verification Email (${cooldown}s)`
                : 'Resend Verification Email'}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsVerificationPending(false);
                setError('');
              }}
              className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 py-1"
            >
              Mistyped email? Edit email address
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <Link
              to="/login"
              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Already verified? Go to Login &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Standard Registration Form
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg dark:bg-gray-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2 dark:text-white">Create an Account</h2>
        <p className="text-center text-gray-500 text-sm mb-6 dark:text-gray-300">
          Join E-Library to explore millions of books
        </p>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
          >
            <div className="flex items-start">
              <span className="mr-2 font-bold">⚠️</span>
              <div>
                <p>{error}</p>
                {alreadyVerified && (
                  <div className="mt-2 flex space-x-3">
                    <Link
                      to="/login"
                      className="font-semibold text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
                    >
                      Sign In now &rarr;
                    </Link>
                    <Link
                      to="/requestresetpassword"
                      className="font-medium text-gray-600 dark:text-gray-400 underline hover:text-gray-800"
                    >
                      Reset Password
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-1 dark:text-gray-200" htmlFor="fullname">
              Full Name
            </label>
            <input
              type="text"
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3 py-2 border rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 focus:outline-none transition ${
                fieldErrors.fullname
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-500 focus:border-blue-500'
              }`}
              placeholder="e.g. Soham Hathi"
            />
            {fieldErrors.fullname && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.fullname}</p>
            )}
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-1 dark:text-gray-200" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3 py-2 border rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 focus:outline-none transition ${
                fieldErrors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-500 focus:border-blue-500'
              }`}
              placeholder="name@example.com"
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-1 dark:text-gray-200" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className={`w-full px-3 py-2 border rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 focus:outline-none transition ${
                fieldErrors.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-500 focus:border-blue-500'
              }`}
              placeholder="At least 6 characters"
            />
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            id="signup-submit-btn"
            disabled={loading}
            className={`w-full font-bold py-2.5 px-4 rounded-lg focus:outline-none transition shadow ${
              loading
                ? 'bg-blue-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6 dark:text-gray-300">
          Already have an account?{' '}
          <Link className="text-blue-600 font-semibold hover:underline dark:text-blue-400" to="/login">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
