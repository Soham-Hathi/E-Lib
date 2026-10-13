import { useEffect, useState } from "react";
import { IoCloseSharp } from "react-icons/io5";
import { useParams, Link, useNavigate } from "react-router-dom"; 
import axios from "axios";
import { useCart } from "../context/CartContext";
import { 
    FiShoppingCart, 
    FiCheck, 
    FiCreditCard, 
    FiCheckCircle, 
    FiXCircle, 
    FiAlertCircle, 
    FiMail, 
    FiPhone, 
    FiShield,
    FiBookOpen,
    FiBookmark,
    FiStar,
    FiTrash2
} from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const OneBook = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [bookData, setBookData] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('razorpay');
    const [quantity, setQuantity] = useState(1);
    const [totalPrice, setTotalPrice] = useState(0);
    const [aiSummary, setAiSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [cartNotice, setCartNotice] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [simulatedModal, setSimulatedModal] = useState(null);

    // Form inputs and validation state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('Digital Library Access');
    const [orderError, setOrderError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');
    const [userProfile, setUserProfile] = useState(null);
    const [resendStatus, setResendStatus] = useState('');
    const [isResending, setIsResending] = useState(false);

    // Reviews & Ratings State
    const [reviewsData, setReviewsData] = useState({ reviews: [], stats: { averageRating: 0, totalReviews: 0, distribution: {} } });
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewTitle, setReviewTitle] = useState('');
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewMsg, setReviewMsg] = useState('');

    // Bookshelf State
    const [shelfStatus, setShelfStatus] = useState(null);
    const [showShelfMenu, setShowShelfMenu] = useState(false);
    const [shelfSaving, setShelfSaving] = useState(false);
    const [shelfToast, setShelfToast] = useState('');

    const token = localStorage.getItem('token');

    const fetchReviews = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/review/${id}`);
            setReviewsData(res.data);
        } catch (err) {
            console.warn('Could not load reviews:', err.message);
        }
    };

    const fetchShelfStatus = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/bookshelf/status/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShelfStatus(res.data.shelf);
        } catch (err) {
            console.warn('Could not load shelf status:', err.message);
        }
    };

    useEffect(() => {
        const fetchBookData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/book/getonebook/${id}`);
                setBookData(response.data);
                setTotalPrice(response.data.price);
                if (response.data.price === 0) {
                    setSelectedPayment('direct');
                }
            } catch (error) {
                console.error("Error fetching book data:", error);
            }
        };

        fetchBookData();
        fetchReviews();
        fetchShelfStatus();
    }, [id]);

    const handleAddToShelf = async (shelfName) => {
        if (!token) {
            navigate('/login');
            return;
        }
        setShelfSaving(true);
        try {
            await axios.post(`${API_BASE_URL}/bookshelf`, {
                bookId: id,
                shelf: shelfName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShelfStatus(shelfName);
            setShowShelfMenu(false);
            setShelfToast(`Added to ${shelfName.replace('_', ' ')}!`);
            setTimeout(() => setShelfToast(''), 3000);
        } catch (err) {
            console.error('Failed to update shelf:', err);
        } finally {
            setShelfSaving(false);
        }
    };

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!token) {
            navigate('/login');
            return;
        }
        if (!reviewComment.trim()) return;

        setReviewSubmitting(true);
        setReviewMsg('');
        try {
            await axios.post(`${API_BASE_URL}/review/${id}`, {
                rating: reviewRating,
                title: reviewTitle.trim(),
                comment: reviewComment.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReviewMsg('Thank you! Your review has been published.');
            setReviewTitle('');
            setReviewComment('');
            fetchReviews();
            setTimeout(() => setReviewMsg(''), 4000);
        } catch (err) {
            setReviewMsg(err.response?.data?.message || 'Failed to submit review.');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm('Delete your review?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/review/${reviewId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchReviews();
        } catch (err) {
            console.error('Delete review error:', err);
        }
    };

    useEffect(() => {
        if (bookData) {
            setTotalPrice(bookData.price * quantity);
        }
    }, [quantity, bookData]);

    const handleBuyNow = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setOrderError('');
        setOrderSuccess('');
        setResendStatus('');
        setPhoneError('');

        // Refresh user profile to check real verification status
        try {
            const profileRes = await axios.get(`${API_BASE_URL}/user/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserProfile(profileRes.data.user);
        } catch (err) {
            console.warn('Could not refresh profile:', err);
        }

        if (bookData?.price === 0) {
            setSelectedPayment('direct');
        } else {
            setSelectedPayment('razorpay');
        }

        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setOrderError('');
        setOrderSuccess('');
        setPhoneError('');
    };

    const storedUserData = localStorage.getItem('Book-User-Data');
    let user = null;
    try {
        user = storedUserData ? JSON.parse(storedUserData) : null;
    } catch {
        user = null;
    }

    // Active user information with priority to authoritative fetched profile
    const activeUser = userProfile || user;
    const isEmailVerified = activeUser ? activeUser.isVerified !== false : true;

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

    // Client-side phone validation
    const validatePhone = (number) => {
        if (!number || !number.trim()) {
            return 'Contact phone number is required.';
        }
        const clean = number.replace(/[\s\-\(\)\+]/g, '');
        const dummyNumbers = new Set([
            '1234567890', '0123456789', '1234565789', '0987654321',
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

    // Resend verification link
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

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setOrderError('');
        setOrderSuccess('');

        const token = localStorage.getItem('token');
        if (!token) {
            setOrderError('Please log in to complete your purchase.');
            navigate('/login');
            return;
        }

        // 1. Check user email verification
        if (!isEmailVerified) {
            setOrderError(`Your account email (${activeUser?.email}) is not verified. Please verify your email before placing orders.`);
            return;
        }

        // 2. Validate phone number
        const pErr = validatePhone(phoneNumber);
        if (pErr) {
            setPhoneError(pErr);
            setOrderError(pErr);
            return;
        }

        setIsPlacingOrder(true);

        // CASE 1: Razorpay Online Payment (for paid books)
        if (selectedPayment === 'razorpay' && bookData.price > 0) {
            try {
                const orderRes = await axios.post(
                    `${API_BASE_URL}/payment/create-book-order`,
                    {
                        productID: bookData._id,
                        quantity,
                        phoneNumber: phoneNumber.trim(),
                        address: deliveryAddress.trim(),
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const { orderId, amount, currency, keyId, isSimulated } = orderRes.data;
                handleCloseModal();

                if (isSimulated || keyId === 'rzp_test_placeholder') {
                    setSimulatedModal({
                        orderId,
                        amount,
                        currency,
                        phoneNumber,
                        address: deliveryAddress,
                    });
                    setIsPlacingOrder(false);
                    return;
                }

                const scriptLoaded = await loadRazorpayScript();
                if (!scriptLoaded) {
                    setSimulatedModal({ orderId, amount, currency, phoneNumber, address: deliveryAddress });
                    setIsPlacingOrder(false);
                    return;
                }

                const options = {
                    key: keyId,
                    amount: amount,
                    currency: currency || 'INR',
                    name: 'E-Library Bookstore',
                    description: `Purchase: ${bookData.name}`,
                    order_id: orderId,
                    handler: async function (response) {
                        try {
                            await axios.post(
                                `${API_BASE_URL}/payment/verify-book-payment`,
                                {
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    productID: bookData._id,
                                    quantity,
                                    phoneNumber: phoneNumber.trim(),
                                    address: deliveryAddress.trim(),
                                },
                                { headers: { Authorization: `Bearer ${token}` } }
                            );
                            setOrderSuccess('Payment successful! Your order has been placed.');
                            navigate('/myorders');
                        } catch (err) {
                            setOrderError(err.response?.data?.message || 'Payment verification failed.');
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
                setIsPlacingOrder(false);
            } catch (err) {
                console.error('Online checkout error:', err);
                setOrderError(err.response?.data?.message || 'Failed to initiate secure payment.');
                setIsPlacingOrder(false);
            }
            return;
        }

        // CASE 2: Stripe Checkout (for paid books)
        if (selectedPayment === 'stripe' && bookData.price > 0) {
            try {
                const sessionRes = await axios.post(
                    `${API_BASE_URL}/order/create-checkout-session`,
                    {
                        productID: bookData._id,
                        quantity,
                        image: bookData.image,
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                if (sessionRes.data.url) {
                    window.location.href = sessionRes.data.url;
                }
            } catch (error) {
                console.error("Error creating Stripe session:", error);
                setOrderError(error.response?.data?.error || "Failed to initiate Stripe payment session.");
            } finally {
                setIsPlacingOrder(false);
            }
            return;
        }

        // CASE 3: Direct / Free Digital Access or Cash on Delivery
        try {
            const isFree = (bookData.price || 0) === 0;
            const chosenMethod = isFree ? 'Free Digital Access' : 'Cash on Delivery';

            const response = await axios.post(
                `${API_BASE_URL}/order/placeorder`,
                {
                    productID: bookData._id,
                    quantity,
                    phoneNumber: phoneNumber.trim(),
                    address: deliveryAddress.trim(),
                    paymentMethod: chosenMethod,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setOrderSuccess(response.data.message || 'Order placed successfully! A confirmation message has been dispatched to your email.');
            setTimeout(() => {
                handleCloseModal();
                navigate('/myorders');
            }, 1800);
        } catch (error) {
            console.error("Error placing order:", error);
            setOrderError(error.response?.data?.message || 'Failed to place order.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    // Simulated test payment completion handler
    const handleSimulatedPayment = async (isSuccess) => {
        if (!simulatedModal) return;
        const { orderId, phoneNumber: simPhone, address: simAddress } = simulatedModal;
        const token = localStorage.getItem('token');
        setSimulatedModal(null);

        if (!isSuccess) {
            setOrderError('Simulated payment cancelled.');
            return;
        }

        setIsPlacingOrder(true);
        try {
            await axios.post(
                `${API_BASE_URL}/payment/verify-book-payment`,
                {
                    razorpay_order_id: orderId,
                    razorpay_payment_id: `pay_sim_${Date.now()}`,
                    razorpay_signature: `sig_test_${Date.now()}`,
                    productID: bookData._id,
                    quantity,
                    phoneNumber: simPhone,
                    address: simAddress,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setOrderSuccess('Payment verified! Your order has been placed.');
            navigate('/myorders');
        } catch (err) {
            console.error('Simulated verification error:', err);
            setOrderError(err.response?.data?.message || 'Payment verification failed.');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleAISummary = async () => {
        if (!bookData) return;
        setLoadingSummary(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/ai/summarize`, { 
                name: bookData.name, 
                description: bookData.description 
            });
            setAiSummary(res.data.summary);
        } catch (error) {
            setAiSummary("Oops! I couldn't generate a summary right now.");
        } finally {
            setLoadingSummary(false);
        }
    };

    if (!bookData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                <p className="text-gray-600 dark:text-gray-300">Loading book details...</p>
            </div>
        );
    }

    return (
        <>
            <section className="text-gray-600 body-font overflow-hidden dark:bg-gray-800 min-h-screen">
                <div className="container mx-auto px-5 py-16">
                    <div className="lg:w-4/5 mx-auto flex flex-wrap items-center">
                        <img
                            alt={bookData.name}
                            className="lg:w-1/3 w-full lg:h-auto h-64 object-cover object-center rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                            src={bookData.image}
                        />
                        <div className="lg:w-2/3 w-full lg:pl-10 lg:py-6 mt-6 lg:mt-0">
                            <span className="text-xs uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-3 py-1 rounded-full">
                                {bookData.category}
                            </span>
                            <h1 className="text-gray-900 dark:text-white text-3xl title-font font-bold mb-2 mt-3">
                                {bookData.name}
                            </h1>
                            <p className="leading-relaxed dark:text-gray-300 text-sm md:text-base mb-6">
                                {bookData.description}
                            </p>
                            
                            <div className="flex items-center pb-5 border-b border-gray-200 dark:border-gray-700 mb-5">
                                <button
                                    onClick={handleAISummary}
                                    disabled={loadingSummary}
                                    className="flex items-center gap-2 text-white bg-indigo-600 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-all font-semibold text-sm shadow-xs"
                                >
                                    {loadingSummary ? 'Generating AI Summary...' : '✨ Generate AI Summary'}
                                </button>
                            </div>
                            
                            {aiSummary && (
                                <div className="p-4 mb-5 bg-indigo-50 dark:bg-gray-700/60 border-l-4 border-indigo-500 rounded-lg shadow-xs">
                                    <p className="text-gray-800 dark:text-gray-100 text-sm leading-relaxed">{aiSummary}</p>
                                </div>
                            )}

                            {cartNotice && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg flex items-center justify-between text-sm animate-fade-in">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <FiCheck className="text-green-600 dark:text-green-400" /> Added to your shopping cart!
                                    </span>
                                    <Link to="/cart" className="text-xs font-bold underline hover:text-green-800 dark:hover:text-green-200">
                                        View Cart &rarr;
                                    </Link>
                                </div>
                            )}

                            {shelfToast && (
                                <div className="mb-4 p-2.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 rounded-lg text-xs font-semibold animate-fade-in">
                                    {shelfToast}
                                </div>
                            )}

                            {/* VIP Membership Perks & Upsell Banner */}
                            {activeUser?.isPro ? (
                                <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/80 dark:border-amber-500/40 rounded-xl flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-200 shadow-xs">
                                    <span className="flex items-center gap-2">
                                        <span className="text-base">👑</span>
                                        <span>VIP Pass Active: Full online reading & verified ePub downloads included!</span>
                                    </span>
                                    <Link to={`/reader/${id}`} className="font-bold underline text-amber-900 dark:text-amber-100 hover:text-amber-600">
                                        Read Now &rarr;
                                    </Link>
                                </div>
                            ) : (
                                bookData.price > 0 && (
                                    <div className="mb-5 p-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-blue-800 dark:text-blue-200 shadow-xs">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <span>👑</span>
                                            <span>Or read this book and all 160 titles unlimited with <strong>VIP Reader Pass</strong> (from ₹149/mo)</span>
                                        </span>
                                        <Link to="/membership" className="font-bold text-blue-600 dark:text-blue-400 underline hover:text-blue-700">
                                            View VIP Plans &rarr;
                                        </Link>
                                    </div>
                                )
                            )}

                            <div className="flex flex-wrap items-center gap-3">
                                <span className="font-bold text-3xl text-gray-900 dark:text-white mr-2">
                                    {bookData.price === 0 ? 'Free' : `₹${bookData.price}`}
                                </span>

                                <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                                    {/* Real ePub Download Link if available */}
                                    {bookData.formats?.epub && (
                                        <a
                                            href={bookData.formats.epub}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500 py-2.5 px-4 focus:outline-none hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg font-semibold text-sm transition shadow-xs"
                                            title="Download verified original ePub digital file"
                                        >
                                            <span>⬇️</span> Download ePub
                                        </a>
                                    )}

                                    {/* Official Public Domain / Open Library Record */}
                                    {bookData.sourceUrl && (
                                        <a
                                            href={bookData.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 py-2.5 px-3 focus:outline-none hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-semibold text-xs transition"
                                            title="Official Bibliographic Archive Record"
                                        >
                                            <span>🏛️</span> {bookData.sourceProvider === 'gutenberg' ? 'Gutenberg' : 'Open Library'}
                                        </a>
                                    )}

                                    {/* Read Online in Interactive E-Reader */}
                                    <Link
                                        to={`/reader/${id}`}
                                        id="read-now-btn"
                                        className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-500 py-2.5 px-4 focus:outline-none hover:bg-cyan-100 dark:hover:bg-cyan-900/60 rounded-lg font-semibold text-sm transition"
                                    >
                                        <FiBookOpen /> Read Online
                                    </Link>

                                    {/* Personal Bookshelf Dropdown */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowShelfMenu(!showShelfMenu)}
                                            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-lg font-semibold text-sm border transition ${
                                                shelfStatus
                                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-400'
                                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            <FiBookmark /> {shelfStatus ? shelfStatus.replace('_', ' ') : 'Bookshelf'}
                                        </button>
                                        {showShelfMenu && (
                                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-30">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddToShelf('currently_reading')}
                                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    📖 Currently Reading
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddToShelf('want_to_read')}
                                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    🔖 Want to Read
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddToShelf('favorites')}
                                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    ⭐ Favorite
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddToShelf('completed')}
                                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                >
                                                    ✅ Completed
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        id="add-to-cart-btn"
                                        onClick={() => {
                                            addToCart(bookData, quantity);
                                            setCartNotice(true);
                                            setTimeout(() => setCartNotice(false), 3500);
                                        }}
                                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-800 border border-blue-500 py-2.5 px-5 focus:outline-none hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg font-semibold text-sm transition"
                                    >
                                        <FiShoppingCart /> Add to Cart
                                    </button>

                                    <button
                                        id="buy-now-btn"
                                        onClick={handleBuyNow}
                                        className="text-white bg-blue-600 border-0 py-2.5 px-5 focus:outline-none hover:bg-blue-700 rounded-lg font-semibold text-sm transition shadow-md"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community Reviews & Ratings Section */}
                    <div className="lg:w-4/5 mx-auto mt-16 pt-12 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                    Customer Reviews & Ratings
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Verified feedback from community readers and scholars
                                </p>
                            </div>

                            {/* Score Card */}
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-600">
                                <div className="text-center pr-4 border-r border-gray-200 dark:border-gray-600">
                                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                                        {reviewsData.stats?.averageRating || '0.0'}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 block">out of 5</span>
                                </div>
                                <div>
                                    <div className="flex text-amber-400 text-sm mb-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span key={star}>
                                                {star <= Math.round(reviewsData.stats?.averageRating || 0) ? '★' : '☆'}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {reviewsData.stats?.totalReviews || 0} global ratings
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Review Submission Box */}
                        <div className="mb-12 bg-white dark:bg-gray-750 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                                Share Your Reading Experience
                            </h4>
                            {token ? (
                                <form onSubmit={handleSubmitReview} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">
                                            Your Rating:
                                        </label>
                                        <div className="flex gap-2 text-2xl text-amber-400 cursor-pointer">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setReviewRating(s)}
                                                    className="focus:outline-none transition transform hover:scale-110"
                                                >
                                                    {s <= reviewRating ? '★' : '☆'}
                                                </button>
                                            ))}
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 self-center ml-2">
                                                {reviewRating} of 5 stars
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            value={reviewTitle}
                                            onChange={(e) => setReviewTitle(e.target.value)}
                                            placeholder="Review Headline (e.g. Masterpiece on human psychology)"
                                            className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 dark:text-white transition"
                                        />
                                    </div>

                                    <div>
                                        <textarea
                                            rows="3"
                                            required
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            placeholder="What did you enjoy about the book? How were the ideas and storytelling?"
                                            className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3.5 outline-none focus:border-blue-500 dark:text-white transition"
                                        ></textarea>
                                    </div>

                                    {reviewMsg && (
                                        <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                                            {reviewMsg}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={reviewSubmitting || !reviewComment.trim()}
                                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                                    >
                                        {reviewSubmitting ? 'Publishing Review...' : 'Submit Review'}
                                    </button>
                                </form>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Please{' '}
                                    <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold underline">
                                        sign in
                                    </Link>{' '}
                                    to leave a review for this book.
                                </p>
                            )}
                        </div>

                        {/* Customer Reviews Feed */}
                        <div className="space-y-4">
                            {reviewsData.reviews?.length > 0 ? (
                                reviewsData.reviews.map((rev) => (
                                    <div
                                        key={rev._id}
                                        className="p-5 bg-white dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs"
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                                                    {rev.userName?.[0] || 'R'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                                                            {rev.userName}
                                                        </h5>
                                                        {rev.isVerifiedBuyer && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                                                                ✓ Verified Reader
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="text-amber-400 font-bold">
                                                            {'★'.repeat(rev.rating)}
                                                            {'☆'.repeat(5 - rev.rating)}
                                                        </span>
                                                        <span>&bull;</span>
                                                        <span>
                                                            {new Date(rev.createdAt).toLocaleDateString(undefined, {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {token && (activeUser?.email === rev.userEmail || activeUser?.isAdmin) && (
                                                <button
                                                    onClick={() => handleDeleteReview(rev._id)}
                                                    className="text-gray-400 hover:text-red-500 transition p-1"
                                                    title="Delete Review"
                                                >
                                                    <FiTrash2 className="text-sm" />
                                                </button>
                                            )}
                                        </div>

                                        {rev.title && (
                                            <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white mt-1">
                                                {rev.title}
                                            </p>
                                        )}
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                            {rev.comment}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        No reviews yet. Be the first to share your thoughts on this title!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Place Order Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        Place Order
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {bookData.name}
                                    </p>
                                </div>
                                <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-white">
                                    <IoCloseSharp className="text-2xl" />
                                </button>
                            </div>

                            <form onSubmit={handlePlaceOrder} className="space-y-3.5">
                                {/* User Account & Verification Status */}
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
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

                                {/* Unverified Account Warning & Resend Button */}
                                {!isEmailVerified && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                                        <div className="flex items-start gap-2">
                                            <FiAlertCircle className="text-base shrink-0 mt-0.5 text-amber-600" />
                                            <div className="flex-1">
                                                <p className="font-semibold">Email Verification Required</p>
                                                <p className="mt-0.5">
                                                    Your email ({activeUser?.email}) must be verified before you can place orders.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={handleResendVerification}
                                                    disabled={isResending}
                                                    className="mt-2 text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-800 text-xs inline-block"
                                                >
                                                    {isResending ? 'Sending verification link...' : 'Resend verification link to my email'}
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

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Quantity:</label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                            min="1"
                                            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full text-sm dark:bg-gray-700 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Total Amount (₹):</label>
                                        <input
                                            type="text"
                                            value={bookData.price === 0 ? 'Rs. 0 (Free)' : `Rs. ${totalPrice}`}
                                            readOnly
                                            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full text-sm dark:bg-gray-700 dark:text-white font-bold text-blue-600"
                                        />
                                    </div>
                                </div>

                                {/* Phone Number with Real-time Validation */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                                        <span>Phone Number:</span>
                                        <span className="text-gray-400 font-normal">10-digit mobile</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={handlePhoneChange}
                                        placeholder="e.g. 9876543210"
                                        className={`p-2 border rounded-lg w-full text-sm dark:bg-gray-700 dark:text-white transition ${
                                            phoneError 
                                                ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
                                                : phoneNumber && !phoneError 
                                                    ? 'border-green-500 focus:ring-1 focus:ring-green-500' 
                                                    : 'border-gray-200 dark:border-gray-600'
                                        }`}
                                        required
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
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Indian mobile number (starts with 6, 7, 8, or 9)
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Delivery Address / Note:</label>
                                    <input
                                        type="text"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full text-sm dark:bg-gray-700 dark:text-white"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Payment Method:</label>
                                    {bookData.price === 0 ? (
                                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                            <FiCheckCircle className="text-base text-blue-600 dark:text-blue-400 shrink-0" />
                                            <span>Free Public Domain Book &bull; Instant Digital Reading Access</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={selectedPayment}
                                            onChange={(e) => setSelectedPayment(e.target.value)}
                                            className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg w-full text-sm dark:bg-gray-700 dark:text-white font-medium"
                                            required
                                        >
                                            <option value="razorpay">⚡ Pay Online (Razorpay - UPI, Cards, NetBanking)</option>
                                            <option value="cash_on_delivery">💵 Cash on Delivery / Pay on Delivery</option>
                                            <option value="stripe">💳 International Card (Stripe)</option>
                                        </select>
                                    )}
                                </div>

                                {/* Order Status Messages */}
                                {orderError && (
                                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-start gap-2">
                                        <FiAlertCircle className="text-base shrink-0 mt-0.5 text-red-600" />
                                        <p className="font-semibold">{orderError}</p>
                                    </div>
                                )}

                                {orderSuccess && (
                                    <div className="p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-xs flex items-start gap-2">
                                        <FiCheckCircle className="text-base shrink-0 mt-0.5 text-green-600" />
                                        <p className="font-semibold">{orderSuccess}</p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isPlacingOrder || !isEmailVerified || !!phoneError || !phoneNumber.trim()}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition shadow-md disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
                                >
                                    <FiCreditCard />
                                    {isPlacingOrder 
                                        ? 'Processing Order...' 
                                        : bookData.price === 0 
                                            ? 'Place Order (Free Access)' 
                                            : `Place Order (₹${totalPrice})`}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Simulated Payment Modal */}
                {simulatedModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                                    <FiCreditCard className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                        Razorpay Test Gateway
                                    </h3>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                                        Local Development Simulator
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>Book Title</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{bookData.name}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    <span>Quantity</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{quantity} copy</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 text-sm font-bold text-gray-900 dark:text-white">
                                    <span>Total to Pay:</span>
                                    <span className="text-lg text-green-600 dark:text-green-400">₹{totalPrice}</span>
                                </div>
                            </div>

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
            </section>
        </>
    );
};

export default OneBook;
