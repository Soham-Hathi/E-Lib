import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:3000';

const ResetPasswordRequest = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    setSuccessInfo(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/user/emailotp`, {
        email: email.trim().toLowerCase(),
      });

      const data = response.data;
      setSuccessInfo(data);

      // If in dev preview mode with visible preview OTP, give user a moment or button to proceed
      if (!data.previewOtp) {
        // Automatic redirection to OTP entry
        setTimeout(() => {
          navigate(`/otpinput?email=${encodeURIComponent(data.email || email.trim())}`, {
            state: { 
              email: data.email || email.trim(),
              previewOtp: data.previewOtp || null,
            },
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      const msg = err.response?.data?.message || 'An error occurred while sending reset instructions.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToOtp = () => {
    const targetEmail = successInfo?.email || email.trim();
    navigate(`/otpinput?email=${encodeURIComponent(targetEmail)}`, {
      state: { 
        email: targetEmail,
        previewOtp: successInfo?.previewOtp || null,
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg dark:bg-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Reset Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            Enter your email address and we'll send a 6-digit OTP to reset your password.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-start"
          >
            <span className="mr-2">⚠️</span>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {successInfo && (
          <div
            role="status"
            className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300"
          >
            <p className="font-semibold mb-1">OTP Dispatched!</p>
            <p className="text-xs">
              A 6-digit verification code was sent to <strong>{successInfo.maskedEmail}</strong>.
            </p>

            {successInfo.previewOtp && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded text-amber-900 dark:text-amber-200 text-xs">
                <span className="font-bold">⚡ Dev Mode OTP:</span>{' '}
                <span className="font-mono text-base font-bold tracking-widest text-blue-600 dark:text-blue-400">
                  {successInfo.previewOtp}
                </span>
              </div>
            )}

            <button
              type="button"
              id="proceed-otp-btn"
              onClick={handleProceedToOtp}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition"
            >
              Enter OTP Code Now &rarr;
            </button>
          </div>
        )}

        {!successInfo && (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                htmlFor="reset-email"
                className="block text-gray-700 text-sm font-semibold mb-1 dark:text-gray-200"
              >
                Account Email
              </label>
              <input
                type="email"
                id="reset-email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              id="send-reset-otp-btn"
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
                  Sending OTP...
                </span>
              ) : (
                'Send Reset OTP'
              )}
            </button>
          </form>
        )}

        <div className="flex justify-between items-center text-xs mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400 font-medium">
            &larr; Back to Login
          </Link>
          <Link to="/signup" className="text-gray-500 hover:underline dark:text-gray-300">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordRequest;
