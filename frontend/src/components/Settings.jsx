import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeContext } from '../ThemeContext';
import { FiLock, FiMoon, FiSun, FiTrash2, FiShield, FiAlertTriangle, FiArrowLeft } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';

const Settings = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!token) {
    navigate('/login');
    return null;
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMessage({ text: '', type: '' });

    if (!currentPassword) {
      setPwdMessage({ text: 'Please enter your current password.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMessage({ text: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }

    setPwdLoading(true);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/user/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPwdMessage({ text: response.data.message || 'Password changed successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setPwdMessage({
        text: err.response?.data?.message || 'Failed to update password. Verify your current password.',
        type: 'error',
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm deletion.');
      return;
    }

    setDeleteLoading(true);

    try {
      await axios.delete(`${API_BASE_URL}/user/account`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { password: deletePassword },
      });

      localStorage.removeItem('token');
      localStorage.removeItem('Book-User-Data');
      alert('Your account has been deleted.');
      navigate('/');
      window.location.reload();
    } catch (err) {
      console.error('Account deletion error:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Incorrect password.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 py-12 px-4 transition-colors">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition"
          >
            <FiArrowLeft /> Back to Home
          </Link>
          <Link
            to="/profile"
            className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg transition"
          >
            View Profile &rarr;
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>

        {/* Section 1: Appearance & Display */}
        <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-600">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            {theme === 'dark' ? <FiMoon className="text-blue-500" /> : <FiSun className="text-amber-500" />}
            Theme & Appearance
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Customize the visual style of your reading environment.
          </p>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-600 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">
                {theme === 'dark' ? 'Dark Reading Mode' : 'Light Classic Mode'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300">
                {theme === 'dark' ? 'High-contrast dark palette for night study.' : 'Standard crisp light background.'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>

        {/* Section 2: Security & Password */}
        <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-600">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <FiLock className="text-indigo-500" />
            Password & Security
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            Ensure your account is protected with a strong, distinct password.
          </p>

          {pwdMessage.text && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm ${
                pwdMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {pwdMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2.5 px-5 rounded-lg transition shadow disabled:opacity-50"
            >
              {pwdLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Section 3: Danger Zone */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-1 flex items-center gap-2">
            <FiAlertTriangle />
            Danger Zone
          </h2>
          <p className="text-xs text-red-600 dark:text-red-300 mb-6">
            Permanent account operations. This action cannot be undone.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">Delete My Account</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Permanently remove your account, profile details, and orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 px-4 rounded-lg transition shadow"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                <FiTrash2 /> Confirm Account Deletion
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                Are you sure you want to delete your account? All reading progress, orders, and saved data will be permanently removed. Enter your password to confirm.
              </p>

              {deleteError && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-950/50 border border-red-300 text-red-700 dark:text-red-300 rounded-lg text-xs">
                  {deleteError}
                </div>
              )}

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Your Password
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    placeholder="Enter password to confirm"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                    className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 px-3 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {deleteLoading ? 'Deleting Account...' : 'Permanently Delete'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
