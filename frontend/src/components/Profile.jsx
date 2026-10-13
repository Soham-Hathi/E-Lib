import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiCalendar, FiShield, FiCheckCircle, FiEdit2, FiSave, FiArrowLeft } from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Profile = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [profile, setProfile] = useState(null);
  const [fullname, setFullname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [subDetails, setSubDetails] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = response.data.user;
        setProfile(userData);
        setFullname(userData.fullname || '');

        // Fetch active subscription details
        try {
          const subRes = await axios.get(`http://localhost:3000/payment/subscription`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (subRes.data) {
            setSubDetails(subRes.data);
          }
        } catch {
          // ignore if no subscription
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setMessage({ text: 'Unable to load profile data from server.', type: 'error' });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!fullname.trim() || fullname.trim().length < 2) {
      setMessage({ text: 'Full name must be at least 2 characters.', type: 'error' });
      return;
    }

    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await axios.put(
        `${API_BASE_URL}/user/profile`,
        { fullname: fullname.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile(response.data.user);
      setIsEditing(false);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });

      // Update cached localStorage session name
      const stored = localStorage.getItem('Book-User-Data');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.fullname = response.data.user.fullname;
          localStorage.setItem('Book-User-Data', JSON.stringify(parsed));
        } catch {
          // ignore cache sync error
        }
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to update profile.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 py-12 px-4 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition"
          >
            <FiArrowLeft /> Back to Home
          </Link>
          <Link
            to="/settings"
            className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg transition"
          >
            Account Settings &rarr;
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-600 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/40">
              {profile?.fullname ? profile.fullname[0].toUpperCase() : 'U'}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">{profile?.fullname}</h1>
              <p className="text-blue-100 text-sm mt-0.5">{profile?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-300/40 text-green-100 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  <FiCheckCircle className="text-xs" /> Email Verified
                </span>
                {profile?.isAdmin && (
                  <span className="inline-flex items-center gap-1 bg-purple-500/30 border border-purple-300/40 text-purple-100 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    <FiShield className="text-xs" /> Administrator
                  </span>
                )}
                {profile?.isPro && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/30 border border-amber-300/40 text-amber-100 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    ★ Pro Subscriber
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Toast */}
          {message.text && (
            <div
              className={`m-6 p-4 rounded-xl text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Profile Form Details */}
          <div className="p-8 space-y-6">
            <form onSubmit={handleUpdate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-600 rounded-lg text-sm font-medium text-gray-800 dark:text-white">
                      <span>{profile?.fullname}</span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <FiEdit2 /> Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Email Address (Read-only) */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 flex items-center justify-between">
                    <span>{profile?.email}</span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">Primary</span>
                  </div>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Account Status
                  </label>
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200">
                    {profile?.isAdmin ? 'Administrator Access' : 'Standard Reader Account'}
                  </div>
                </div>

                {/* Member Since */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Member Since
                  </label>
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Verified Member'}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-5 rounded-lg transition shadow disabled:opacity-50"
                  >
                    <FiSave /> {saving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFullname(profile?.fullname || '');
                    }}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white py-2 px-4 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* VIP Reading Membership Status Section */}
          <div className="p-8 border-t border-gray-100 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-800/60 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-2xl shadow-xs">
                  👑
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">VIP Reading Membership</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {profile?.isPro ? 'Full unrestricted access to all 160 books & AI companion is active' : 'Read all 160 real books & get unlimited ePub downloads'}
                  </p>
                </div>
              </div>
              <Link
                to="/membership"
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 self-start sm:self-auto ${
                  profile?.isPro
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 hover:bg-amber-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {profile?.isPro ? 'Manage Membership Plan &rarr;' : 'Upgrade to VIP Pass &rarr;'}
              </Link>
            </div>

            {subDetails?.isPro && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-gray-700/80 p-4 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Tier</span>
                  <strong className="text-gray-800 dark:text-white">{subDetails.planName || 'VIP Reader Monthly'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Status</span>
                  <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Expires On</span>
                  <strong className="text-gray-800 dark:text-white">
                    {subDetails.expiresAt ? new Date(subDetails.expiresAt).toLocaleDateString() : 'Auto-renewing'}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Days Left</span>
                  <strong className="text-amber-500 font-black">{subDetails.daysRemaining || 30} Days</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
