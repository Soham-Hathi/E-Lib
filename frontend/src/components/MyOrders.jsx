import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiXCircle, FiClock, FiCreditCard, FiPackage, FiShoppingBag } from 'react-icons/fi';
import { API_BASE_URL } from '../config/api';

const MyOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [activePayOrder, setActivePayOrder] = useState(null); // for simulated payment modal
    const [isPaying, setIsPaying] = useState(false);

    const token = localStorage.getItem('token');

    // Fetch user's orders from API
    const fetchOrders = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const response = await axios.get(`${API_BASE_URL}/order/myorders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            setErrorMsg(error.response?.data?.message || 'Failed to load your orders.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [token]);

    // Handle canceling the order
    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;

        setMessage('');
        setErrorMsg('');

        try {
            // Note: Second parameter is empty data object {}, third parameter is config with headers!
            const response = await axios.put(
                `${API_BASE_URL}/order/cancelorder/${orderId}`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            // Update order state locally
            setOrders(prev => prev.map(o => o._id === orderId ? { ...o, isCancelled: true } : o));
            setMessage(response.data?.message || 'Order cancelled successfully.');
        } catch (error) {
            console.error('Error canceling order:', error);
            setErrorMsg(error.response?.data?.message || 'Failed to cancel the order. Please try again.');
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

    // Pay for an existing unpaid order online
    const handlePayOrder = async (order) => {
        setIsPaying(true);
        setMessage('');
        setErrorMsg('');

        try {
            const res = await axios.post(
                `${API_BASE_URL}/payment/pay-order/${order._id}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const { orderId, amount, currency, keyId, isSimulated } = res.data;

            // If in simulated dev test mode without real Razorpay credentials
            if (isSimulated || keyId === 'rzp_test_placeholder') {
                setActivePayOrder({
                    order,
                    orderId,
                    amount,
                    currency,
                });
                setIsPaying(false);
                return;
            }

            // Real or Razorpay Test mode
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                // Fallback to simulator
                setActivePayOrder({ order, orderId, amount, currency });
                setIsPaying(false);
                return;
            }

            const options = {
                key: keyId,
                amount: amount,
                currency: currency || 'INR',
                name: 'E-Library',
                description: `Payment for Order #${order._id.substring(0, 8)}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        await axios.post(
                            `${API_BASE_URL}/payment/verify-order-payment/${order._id}`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        setMessage(`Payment confirmed for Order #${order._id.substring(0, 8)}!`);
                        fetchOrders();
                    } catch (err) {
                        setErrorMsg(err.response?.data?.message || 'Payment verification failed.');
                    }
                },
                prefill: {
                    name: order.name,
                    email: order.email,
                    contact: order.phoneNumber,
                },
                theme: { color: '#2563eb' }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error('Payment initiation error:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to initiate payment.');
        } finally {
            setIsPaying(false);
        }
    };

    // Complete simulated test payment
    const handleCompleteSimulatedPayment = async (isSuccess) => {
        if (!activePayOrder) return;
        const { order, orderId } = activePayOrder;
        setActivePayOrder(null);

        if (!isSuccess) {
            setErrorMsg('Payment simulation cancelled by user.');
            return;
        }

        try {
            await axios.post(
                `${API_BASE_URL}/payment/verify-order-payment/${order._id}`,
                {
                    razorpay_order_id: orderId,
                    razorpay_payment_id: `pay_sim_${Date.now()}`,
                    razorpay_signature: `sig_test_${Date.now()}`,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage(`Payment confirmed for Order #${order._id.substring(0, 8)}!`);
            fetchOrders();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Payment verification failed.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Loading your orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-gray-200 dark:border-gray-800 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiPackage className="text-blue-600" /> My Orders & Purchases
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Review your library orders, cancellation status, and online payment receipts.
                        </p>
                    </div>
                    <Link
                        to="/paidbooks"
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition shadow-xs self-start sm:self-auto"
                    >
                        <FiShoppingBag /> Browse Books
                    </Link>
                </div>

                {/* Feedback Alerts */}
                {message && (
                    <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-xl text-sm flex items-center gap-2 shadow-xs">
                        <FiCheckCircle className="text-green-600 text-lg shrink-0" />
                        <span>{message}</span>
                    </div>
                )}
                {errorMsg && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-sm flex items-center gap-2 shadow-xs">
                        <FiXCircle className="text-red-600 text-lg shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Orders List */}
                {orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            const isPaid = order.paymentMethod?.toLowerCase().includes('paid');
                            const isCancelled = order.isCancelled;

                            return (
                                <div
                                    key={order._id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs border transition-all ${
                                        isCancelled
                                            ? 'border-gray-200 dark:border-gray-700 opacity-75'
                                            : isPaid
                                            ? 'border-green-200 dark:border-green-900/60'
                                            : 'border-blue-100 dark:border-gray-700'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                                        <div>
                                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                                                Order #{order._id.substring(0, 10)}
                                            </span>
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                                                {order.productName}
                                            </h3>
                                        </div>

                                        {/* Status Pills */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            {isCancelled ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full">
                                                    <FiXCircle /> Cancelled
                                                </span>
                                            ) : isPaid ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                                                    <FiCheckCircle /> Paid Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                                                    <FiClock /> Unpaid (COD)
                                                </span>
                                            )}

                                            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                                                {order.deliveryStatus || 'Pending'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Order Details Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 text-xs">
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">Quantity</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                {order.quantity} {order.quantity > 1 ? 'copies' : 'copy'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">Total Amount</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                ₹{order.totalPrice}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">Payment Method</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {order.paymentMethod || 'Cash on Delivery'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 dark:text-gray-500 block">Contact Phone</span>
                                            <span className="font-mono text-gray-700 dark:text-gray-300">
                                                {order.phoneNumber || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 gap-3">
                                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                            Delivery Note: {order.address || 'Digital Library Access'}
                                        </p>

                                        <div className="flex items-center gap-2 ml-auto">
                                            {/* Pay Online Button for Unpaid Orders */}
                                            {!isCancelled && !isPaid && (
                                                <button
                                                    onClick={() => handlePayOrder(order)}
                                                    disabled={isPaying}
                                                    className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs disabled:opacity-50"
                                                >
                                                    <FiCreditCard /> Pay Online (₹{order.totalPrice})
                                                </button>
                                            )}

                                            {/* Cancel Order Button */}
                                            {!isCancelled && order.deliveryStatus !== 'Delivered' && (
                                                <button
                                                    onClick={() => handleCancelOrder(order._id)}
                                                    className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                                                >
                                                    Cancel Order
                                                </button>
                                            )}

                                            {isCancelled && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                                    Order cancelled
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                            <FiShoppingBag />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            No orders found
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                            You haven't placed any book orders yet. Browse our library to discover literature, textbooks, and study guides.
                        </p>
                        <Link
                            to="/paidbooks"
                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition shadow-xs"
                        >
                            Explore Book Catalog
                        </Link>
                    </div>
                )}
            </div>

            {/* Interactive Simulated Razorpay Test Modal (when running in test mode) */}
            {activePayOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-scale-up">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                                    <FiCreditCard className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                        Razorpay Test Gateway
                                    </h3>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                        Development Mode Simulator
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                <span>Order Item</span>
                                <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {activePayOrder.order.productName}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <span>Order ID</span>
                                <span className="font-mono text-gray-800 dark:text-gray-200">
                                    #{activePayOrder.order._id.substring(0, 10)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-900 dark:text-white">
                                <span>Total Amount:</span>
                                <span className="text-lg text-green-600 dark:text-green-400">
                                    ₹{activePayOrder.order.totalPrice}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            This simulator uses timing-safe HMAC test signature verification to confirm orders in local development mode without incurring live payment costs.
                        </p>

                        <div className="space-y-2.5">
                            <button
                                onClick={() => handleCompleteSimulatedPayment(true)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
                            >
                                <FiCheckCircle /> Confirm Payment (Simulate Success)
                            </button>
                            <button
                                onClick={() => handleCompleteSimulatedPayment(false)}
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

export default MyOrders;
