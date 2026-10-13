import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing. Please request a new OTP.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/user/reset-password`, {
        token,
        newPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. The link or session may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg dark:bg-gray-700">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            Choose a strong password with at least 6 characters.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300 text-center"
          >
            <p className="font-semibold text-base mb-1">Password Changed Successfully!</p>
            <p className="text-xs mb-3">Your password has been updated. Redirecting to login...</p>
            <Link
              to="/login"
              className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold text-xs px-4 py-2 rounded transition"
            >
              Sign In Now &rarr;
            </Link>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-xs font-semibold mb-1 dark:text-gray-200"
                htmlFor="new-password"
              >
                New Password
              </label>
              <input
                type="password"
                id="new-password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div className="mb-6">
              <label
                className="block text-gray-700 text-xs font-semibold mb-1 dark:text-gray-200"
                htmlFor="confirm-password"
              >
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirm-password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-white dark:bg-gray-600 dark:border-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              id="save-new-password-btn"
              disabled={loading}
              className={`w-full font-bold py-2.5 px-4 rounded-lg focus:outline-none transition shadow ${
                loading
                  ? 'bg-blue-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 text-center">
          <Link to="/login" className="text-xs text-blue-600 hover:underline dark:text-blue-400 font-medium">
            Remember your password? Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
