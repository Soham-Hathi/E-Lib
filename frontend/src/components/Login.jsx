import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Unverified Account Resend State
  const [unverifiedState, setUnverifiedState] = useState({
    isUnverified: false,
    maskedEmail: '',
    email: '',
  });
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState({ text: '', type: '' });

  // Read URL query parameters on load (e.g. ?verified=true, ?error=expired_token)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === 'true') {
      setVerifiedSuccess(true);
      setError('');
    } else if (params.get('error') === 'expired_token') {
      setError('Your verification link has expired. Please log in or request a new verification email below.');
    } else if (params.get('error') === 'invalid_token') {
      setError('The verification link was invalid or has already been used. Please log in or request a new email.');
    }
  }, [location.search]);

  // Resend cooldown timer
  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when editing fields
    if (error) setError('');
    if (unverifiedState.isUnverified) {
      setUnverifiedState({ isUnverified: false, maskedEmail: '', email: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResendStatus({ text: '', type: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/user/login`, {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (response.data.token) {
        const userData = {
          fullname: response.data.user.fullname,
          _id: response.data.user._id,
          email: response.data.user.email,
          isAdmin: response.data.user.isAdmin,
          isPro: response.data.user.isPro,
        };

        localStorage.setItem('Book-User-Data', JSON.stringify(userData));
        localStorage.setItem('token', response.data.token);

        navigate('/');
        window.location.reload();
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const res = err.response;
      if (res && res.status === 403 && res.data && res.data.isVerified === false) {
        // Account exists but is not verified
        setUnverifiedState({
          isUnverified: true,
          maskedEmail: res.data.maskedEmail || formData.email,
          email: res.data.email || formData.email,
        });
        setError('Please verify your email address before logging in.');
      } else if (res && res.data && res.data.message) {
        setError(res.data.message);
      } else {
        setError('Unable to log in. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendFromLogin = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendStatus({ text: '', type: '' });

    const targetEmail = unverifiedState.email || formData.email.trim().toLowerCase();

    try {
      const response = await axios.post(`${API_BASE_URL}/user/resend-verification`, {
        email: targetEmail,
      });

      setResendStatus({
        text: response.data.message || 'Verification email resent successfully!',
        type: 'success',
      });
      setResendCooldown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend verification email.';
      setResendStatus({ text: msg, type: 'error' });
      if (err.response?.data?.cooldownSeconds) {
        setResendCooldown(err.response.data.cooldownSeconds);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg dark:bg-gray-700">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2 dark:text-white">Welcome Back</h2>
        <p className="text-center text-gray-500 text-sm mb-6 dark:text-gray-300">
          Sign in to access your digital library
        </p>

        {/* Verification Success Banner */}
        {verifiedSuccess && (
          <div
            role="status"
            className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300 flex items-start"
          >
            <span className="mr-2 text-lg">✅</span>
            <div>
              <p className="font-semibold">Email verified successfully!</p>
              <p className="text-xs mt-1">Your account is fully activated. Please enter your credentials to log in.</p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
          >
            <div className="flex items-start">
              <span className="mr-2 text-lg">⚠️</span>
              <div>
                <p className="font-medium">{error}</p>

                {/* If account is unverified, offer inline resend verification option */}
                {unverifiedState.isUnverified && (
                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800/60">
                    <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                      Verification instructions were previously sent to{' '}
                      <strong>{unverifiedState.maskedEmail}</strong>.
                    </p>
                    <button
                      type="button"
                      id="login-resend-verification-btn"
                      onClick={handleResendFromLogin}
                      disabled={resendCooldown > 0 || resending}
                      className={`text-xs px-3 py-1.5 rounded font-semibold transition ${
                        resendCooldown > 0 || resending
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {resending
                        ? 'Sending...'
                        : resendCooldown > 0
                        ? `Resend Link (${resendCooldown}s)`
                        : 'Resend Verification Link'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resend Status Message */}
        {resendStatus.text && (
          <div
            className={`p-3 rounded-lg text-xs mb-4 ${
              resendStatus.type === 'success'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {resendStatus.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
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
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 focus:outline-none focus:border-blue-500 transition"
              placeholder="name@example.com"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-gray-700 text-sm font-semibold dark:text-gray-200" htmlFor="password">
                Password
              </label>
              <Link
                to="/requestresetpassword"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 focus:outline-none focus:border-blue-500 transition"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
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
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6 dark:text-gray-300">
          Don't have an account?{' '}
          <Link className="text-blue-600 font-semibold hover:underline dark:text-blue-400" to="/signup">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
