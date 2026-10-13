import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { 
  FiTrash2, 
  FiShoppingBag, 
  FiArrowLeft, 
  FiCheckCircle, 
  FiCreditCard, 
  FiXCircle, 
  FiAlertCircle, 
  FiMail, 
  FiCheck 
} from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getCartSubtotal } = useCart();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [address, setAddress] = useState('Digital Library Access');
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState('');
  const [simulatedModal, setSimulatedModal] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('Book-User-Data');
  let user = null;
  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !token) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/order/validate-coupon`, {
        code: couponCode.trim(),
        amount: getCartSubtotal(),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCouponInfo(res.data);
    } catch (err) {
      setCouponInfo(null);
      setCouponError(err.response?.data?.message || 'Invalid or expired coupon code.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  // Refresh user profile to check real verification status
  useEffect(() => {
    if (token) {
      axios.get(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => setUserProfile(res.data.user))
      .catch((err) => console.warn('Could not refresh user profile in Cart:', err));
    }
  }, [token]);

  const activeUser = userProfile || user;
  const isEmailVerified = activeUser ? activeUser.isVerified !== false : true;

  const subtotal = getCartSubtotal();

  // Client-side phone validation
  const validatePhone = (number) => {
    if (!number || !number.trim()) {
      return 'Contact phone number is required.';
    }
    const clean = number.replace(/[\s\-\(\)\+]/g, '');
    const dummyNumbers = new Set([
      '1234565789', '1234567890', '0123456789', '0987654321',
      '0000000000', '1111111111', '2222222222', '3333333333', '4444444444',
      '5555555555', '6666666666', '7777777777', '8888888888', '9999999999',
    ]);
    if (dummyNumbers.has(clean)) {
      return 'Dummy number not accepted. Please enter a real 10-digit mobile number.';
    }
    if (clean.length === 10) {
      if (!/^[6-9]\d{9}$/.test(clean)) {
        return '10-digit mobile number must start with 6, 7, 8, or 9 (e.g. 9876543210).';
      }
      return '';
    }
    if (clean.length === 12 && clean.startsWith('91')) {
      if (!/^91[6-9]\d{9}$/.test(clean)) {
        return 'Mobile number with +91 country code must start with 6-9.';
      }
      return '';
    }
    if (!/^[1-9]\d{9,13}$/.test(clean)) {
      return 'Please enter a valid 10-digit mobile number (e.g. 9876543210).';
    }
    return '';
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setPhoneNumber(val);
    if (val.trim()) {
      setPhoneError(validatePhone(val));
    } else {
      setPhoneError('Contact phone number is required.');
    }
  };

  const handleResendVerification = async () => {
    const email = activeUser?.email;
    if (!email) return;
    setIsResending(true);
    setResendStatus('');
    try {
      const res = await axios.post(`${API_BASE_URL}/user/resend-verification`, { email });
      setResendStatus(res.data.message || 'Verification link sent to your email inbox!');
    } catch (err) {
      setResendStatus(err.response?.data?.message || 'Failed to resend verification link.');
    } finally {
      setIsResending(false);
    }
  };

  // Helper to dynamically load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      navigate('/login');
      return;
    }

    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    // 1. Email verification check
    if (!isEmailVerified) {
      setError(`Your account email (${activeUser?.email}) is not verified. Please verify your email before placing orders.`);
      return;
    }

    // 2. Phone number validation check
    const pErr = validatePhone(phoneNumber);
    if (pErr) {
      setPhoneError(pErr);
      setError(pErr);
      return;
    }

    setLoading(true);

    // OPTION 1: Razorpay Online Payment (India-First)
    if (paymentMethod === 'razorpay') {
      try {
        const orderRes = await axios.post(
          `${API_BASE_URL}/payment/create-book-order`,
          {
            items: cartItems.map((item) => ({
              productID: item._id,
              quantity: item.quantity,
            })),
            phoneNumber: phoneNumber.trim(),
            address: address.trim(),
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const { orderId, amount, currency, keyId, isSimulated } = orderRes.data;

        // If running in development simulator mode without real secret keys
        if (isSimulated || keyId === 'rzp_test_placeholder') {
          setSimulatedModal({
            orderId,
            amount,
            currency,
            items: cartItems,
          });
          setLoading(false);
          return;
        }

        // Real or Razorpay Test mode
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          // Fallback to simulator
          setSimulatedModal({ orderId, amount, currency, items: cartItems });
          setLoading(false);
          return;
        }

        const options = {
          key: keyId,
          amount: amount,
          currency: currency || 'INR',
          name: 'E-Library Bookstore',
          description: `Cart Checkout (${cartItems.length} items)`,
          order_id: orderId,
          handler: async function (response) {
            try {
              await axios.post(
                `${API_BASE_URL}/payment/verify-book-payment`,
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  items: cartItems.map((item) => ({
                    productID: item._id,
                    quantity: item.quantity,
                  })),
                  phoneNumber: phoneNumber.trim(),
                  address: address.trim(),
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );

              clearCart();
              setOrderSuccess(true);
              setTimeout(() => navigate('/myorders'), 2000);
            } catch (err) {
              setError(err.response?.data?.message || 'Payment verification failed.');
            }
          },
          prefill: {
            name: activeUser?.fullname || 'Customer',
            email: activeUser?.email || '',
            contact: phoneNumber.trim(),
          },
          theme: { color: '#2563eb' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      } catch (err) {
        console.error('Online checkout error:', err);
        setError(err.response?.data?.message || 'Failed to initiate secure online payment.');
        setLoading(false);
      }
      return;
    }

    // OPTION 2: Cash on Delivery / Direct
    try {
      await axios.post(
        `${API_BASE_URL}/order/placeorder`,
        {
          items: cartItems.map((item) => ({
            productID: item._id,
            quantity: item.quantity,
          })),
          productID: cartItems[0]._id,
          productName: cartItems.length === 1 ? cartItems[0].name : `${cartItems[0].name} and ${cartItems.length - 1} more`,
          quantity: cartItems.reduce((acc, i) => acc + i.quantity, 0),
          name: activeUser?.fullname || 'Customer',
          email: activeUser?.email || '',
          phoneNumber: phoneNumber.trim(),
          address: address.trim(),
          paymentMethod: 'Cash on Delivery',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      clearCart();
      setOrderSuccess(true);
      setTimeout(() => navigate('/myorders'), 2000);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Complete simulated test payment
  const handleSimulatedPayment = async (isSuccess) => {
    if (!simulatedModal) return;
    const { orderId } = simulatedModal;
    setSimulatedModal(null);

    if (!isSuccess) {
      setError('Simulated payment cancelled by user.');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/payment/verify-book-payment`,
        {
          razorpay_order_id: orderId,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: `sig_test_${Date.now()}`,
          items: cartItems.map((item) => ({
            productID: item._id,
            quantity: item.quantity,
          })),
          phoneNumber: phoneNumber.trim(),
          address: address.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      clearCart();
      setOrderSuccess(true);
      setTimeout(() => navigate('/myorders'), 2000);
    } catch (err) {
      console.error('Simulated verification error:', err);
      setError(err.response?.data?.message || 'Payment verification failed.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-700 rounded-xl p-8 shadow-lg text-center animate-fade-in">
          <FiCheckCircle className="mx-auto text-5xl text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Order Confirmed!</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
            Your books have been added to your library and your receipt has been dispatched. Redirecting to your orders...
          </p>
          <Link
            to="/myorders"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 py-16 px-4 flex flex-col items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-blue-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500 text-3xl">
            <FiShoppingBag />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Your Cart is Empty</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
            You haven't added any books to your cart yet. Discover bestselling titles and study companions in our collection.
          </p>
          <Link
            to="/paidbooks"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition shadow-md"
          >
            <FiArrowLeft /> Browse Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
          <button
            onClick={clearCart}
            className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-medium"
          >
            <FiTrash2 /> Clear Entire Cart
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-600 flex flex-col sm:flex-row items-center gap-4 transition hover:shadow-md"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-28 object-cover rounded-md flex-shrink-0"
                />

                <div className="flex-1 text-center sm:text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
                    {item.category}
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base mt-0.5">
                    {item.name}
                  </h3>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1">
                    ₹{item.price} each
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center border border-gray-200 dark:border-gray-500 rounded-lg bg-gray-50 dark:bg-gray-600">
                  <button
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="px-3 py-1 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-30 rounded-l-lg transition"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-semibold text-gray-800 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    className="px-3 py-1 text-gray-600 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-r-lg transition"
                  >
                    +
                  </button>
                </div>

                <div className="text-right sm:w-24">
                  <p className="font-bold text-gray-900 dark:text-white text-base">
                    ₹{item.price * item.quantity}
                  </p>
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="text-red-500 hover:text-red-700 text-xs mt-1 transition"
                    title="Remove item"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-4">
              <Link
                to="/paidbooks"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <FiArrowLeft /> Continue Browsing Catalog
              </Link>
            </div>
          </div>

          {/* Checkout Summary Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-600 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-sm pb-4 border-b border-gray-100 dark:border-gray-600">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Digital Delivery:</span>
                  <span className="text-green-600 dark:text-green-400 font-semibold">FREE</span>
                </div>
                {couponInfo && (
                  <div className="flex justify-between text-xs text-green-600 dark:text-green-400 font-semibold">
                    <span>Coupon ({couponInfo.code}):</span>
                    <span>-₹{couponInfo.discount}</span>
                  </div>
                )}
              </div>

              {/* Coupon Redemption Input */}
              {token && (
                <div className="py-3 border-b border-gray-100 dark:border-gray-600">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                    Have a promo coupon?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. READ20, WELCOME50"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 uppercase text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 outline-none text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                  {couponInfo && (
                    <p className="mt-1 text-xs font-semibold text-green-600 dark:text-green-400">
                      ✓ {couponInfo.message}
                    </p>
                  )}
                  {couponError && (
                    <p className="mt-1 text-xs text-red-500">
                      {couponError}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center py-4 text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-600 mb-6">
                <span>Total Amount:</span>
                <span className="text-xl text-blue-600 dark:text-blue-400">
                  ₹{couponInfo ? couponInfo.finalAmount : subtotal}
                </span>
              </div>

              {!token ? (
                <div className="text-center">
                  <p className="text-xs text-amber-600 dark:text-amber-300 mb-3">
                    Please sign in to complete your purchase.
                  </p>
                  <Link
                    to="/login"
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-center transition"
                  >
                    Sign In to Checkout
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleCheckout} className="space-y-4">
                  {/* Active Account Details & Verification Badge */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-600/50 rounded-xl border border-gray-200 dark:border-gray-500">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Account:</span>
                      {isEmailVerified ? (
                        <span className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <FiCheck className="text-xs" /> Verified Account
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <FiAlertCircle className="text-xs" /> Unverified Email
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {activeUser?.fullname || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-0.5">
                      <FiMail className="text-blue-500" /> {activeUser?.email || 'N/A'}
                    </p>
                  </div>

                  {/* Email Verification Banner */}
                  {!isEmailVerified && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      <div className="flex items-start gap-2">
                        <FiAlertCircle className="text-base shrink-0 mt-0.5 text-amber-600" />
                        <div className="flex-1">
                          <p className="font-semibold">Email Verification Required</p>
                          <p className="mt-0.5">
                            Please verify your account email ({activeUser?.email}) to checkout.
                          </p>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={isResending}
                            className="mt-2 text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-800 text-xs inline-block"
                          >
                            {isResending ? 'Sending verification email...' : 'Resend verification link'}
                          </button>
                          {resendStatus && (
                            <p className="mt-1 text-green-700 dark:text-green-300 font-medium">
                              {resendStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Phone Number with Real-time Validation */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1 flex items-center justify-between">
                      <span>Contact Phone Number</span>
                      <span className="text-gray-400 font-normal">10-digit mobile</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      placeholder="e.g. 9876543210"
                      required
                      className={`w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:outline-none transition ${
                        phoneError 
                          ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                          : phoneNumber && !phoneError 
                            ? 'border-green-500 focus:ring-1 focus:ring-green-500' 
                            : 'focus:border-blue-500'
                      }`}
                    />
                    {phoneError ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium flex items-center gap-1">
                        <FiAlertCircle /> {phoneError}
                      </p>
                    ) : phoneNumber ? (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium flex items-center gap-1">
                        <FiCheck /> Valid 10-digit mobile number
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        Indian mobile number (starts with 6, 7, 8, or 9)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Delivery Address / Note
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Digital Delivery / City"
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="razorpay">⚡ Online Payment (UPI, Cards, NetBanking - Razorpay)</option>
                      <option value="cash_on_delivery">💵 Cash on Delivery / Direct</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isEmailVerified || !!phoneError || !phoneNumber.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiCreditCard />
                    {loading ? 'Processing...' : paymentMethod === 'razorpay' ? `Pay Online (₹${subtotal})` : `Place Order (₹${subtotal})`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Razorpay Test Dialog */}
      {simulatedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                <FiCreditCard className="text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Razorpay Checkout Gateway
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                  Test Mode Simulator
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Items in Cart</span>
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {cartItems.length} items
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="text-lg text-green-600 dark:text-green-400">
                  ₹{subtotal}
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              In development mode without live Razorpay secret keys, this test simulator creates an authentic server payment record with timing-safe signature verification.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => handleSimulatedPayment(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <FiCheckCircle /> Confirm Payment (Simulate Success)
              </button>
              <button
                onClick={() => handleSimulatedPayment(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                <FiXCircle /> Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
