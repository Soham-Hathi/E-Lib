import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiAward, FiZap, FiBookOpen, FiDownload, FiHelpCircle, FiChevronDown, FiChevronUp, FiShield, FiStar } from 'react-icons/fi';

const Membership = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBilling, setSelectedBilling] = useState('monthly'); // 'monthly' | 'annual'
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [processingPlanId, setProcessingPlanId] = useState(null);
  const [checkoutNotice, setCheckoutNotice] = useState({ type: '', text: '' });
  const [openFaq, setOpenFaq] = useState(null);
  const [showSimulatedModal, setShowSimulatedModal] = useState(false);
  const [simulatedOrderData, setSimulatedOrderData] = useState(null);
  const [successCelebration, setSuccessCelebration] = useState(false);

  const token = localStorage.getItem('token');
  const storedUserData = localStorage.getItem('Book-User-Data');
  let user = null;
  try {
    user = storedUserData ? JSON.parse(storedUserData) : null;
  } catch {
    user = null;
  }

  // Load plans & current subscription status
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch available plans
        const plansRes = await axios.get('http://localhost:3000/payment/plans');
        if (plansRes.data?.plans) {
          setPlans(plansRes.data.plans);
        }

        // 2. If logged in, fetch subscription status
        if (token) {
          try {
            const subRes = await axios.get('http://localhost:3000/payment/subscription', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (subRes.data && subRes.data.isPro) {
              setActiveSubscription(subRes.data);
            }
          } catch (err) {
            console.warn('Could not fetch subscription status:', err.message);
          }
        }
      } catch (err) {
        console.error('Failed to load membership plans:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

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

  // Handle plan subscription checkout
  const handleSubscribe = async (planId) => {
    if (!token) {
      navigate('/login?redirect=/membership');
      return;
    }

    setProcessingPlanId(planId);
    setCheckoutNotice({ type: '', text: '' });

    try {
      // 1. Create order on backend
      const res = await axios.post(
        'http://localhost:3000/payment/create-order',
        { planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const orderData = res.data;

      // 2. Check if simulated dev mode or real Razorpay
      if (orderData.isSimulated || !orderData.keyId || orderData.keyId === 'rzp_test_placeholder') {
        setSimulatedOrderData(orderData);
        setShowSimulatedModal(true);
        setProcessingPlanId(null);
        return;
      }

      // 3. Real Razorpay SDK Checkout
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setCheckoutNotice({
          type: 'error',
          text: 'Payment gateway SDK failed to load. Please disable ad-blockers and try again.',
        });
        setProcessingPlanId(null);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'E-Library VIP Club',
        description: `Upgrade to ${orderData.planName}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          await verifyAndActivate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: user?.fullname || '',
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (err) => {
        setCheckoutNotice({
          type: 'error',
          text: err.error?.description || 'Payment was declined or cancelled.',
        });
        setProcessingPlanId(null);
      });
      rzp.open();
    } catch (err) {
      console.error('Subscription error:', err);
      const msg = err.response?.data?.message || 'Unable to initiate membership checkout. Please try again.';
      setCheckoutNotice({ type: 'error', text: msg });
      setProcessingPlanId(null);
    }
  };

  // Verify payment on backend
  const verifyAndActivate = async (payload) => {
    try {
      const verifyRes = await axios.post(
        'http://localhost:3000/payment/verify',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (verifyRes.data?.success) {
        // Update local storage user state to isPro: true
        if (user) {
          user.isPro = true;
          localStorage.setItem('Book-User-Data', JSON.stringify(user));
        }

        setActiveSubscription({
          isPro: true,
          status: 'active',
          planName: verifyRes.data.subscription?.plan || 'VIP Reader',
          expiresAt: verifyRes.data.subscription?.expiresAt,
        });

        setShowSimulatedModal(false);
        setSuccessCelebration(true);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setCheckoutNotice({
        type: 'error',
        text: err.response?.data?.message || 'Payment verification failed. Please contact support.',
      });
    } finally {
      setProcessingPlanId(null);
    }
  };

  // Execute dev simulation payment
  const handleConfirmSimulation = async () => {
    if (!simulatedOrderData) return;
    setProcessingPlanId(simulatedOrderData.planId);
    await verifyAndActivate({
      razorpay_order_id: simulatedOrderData.orderId,
      razorpay_payment_id: `pay_sim_${Date.now()}`,
      razorpay_signature: `sig_test_${Date.now()}`,
    });
  };

  const monthlyPlan = plans.find((p) => p.id === 'pro_monthly') || {
    id: 'pro_monthly',
    name: 'VIP Reader Monthly',
    priceRupees: 149,
    features: [
      'Unlimited In-Browser E-Reader Access to All 160 Real Books',
      'Instant ePub & Full-Text Downloads for Offline Reading',
      'Interactive AI Book Tutor & Reading Companion',
      'Personal Bookshelf Cloud Sync & Cross-Device Progress',
      '20% Auto-Discount on all Physical Book Orders',
      'Exclusive Golden VIP Member Crown Badge',
    ],
  };

  const annualPlan = plans.find((p) => p.id === 'pro_annual') || {
    id: 'pro_annual',
    name: 'VIP Scholar Annual',
    priceRupees: 1199,
    savingsText: 'Save ₹589 compared to monthly billing',
    features: [
      'Everything in VIP Reader Monthly',
      'Full 365 Days Uncapped All-You-Can-Read Access',
      'Priority Access to New Releases & Curated Masterpieces',
      'Enhanced AI Chapter Quizzes & In-Depth Concept Explanations',
      'Permanent 25% Auto-Discount on all Physical Book Orders',
      'Distinguished Golden Scholar Crown Badge on Profile',
    ],
  };

  const faqs = [
    {
      q: 'What is included in the VIP Membership?',
      a: 'VIP Membership grants you unlimited access to read all 160+ complete books online in our interactive reader, download DRM-free verified ePub files, access our AI Book Tutor with unlimited chapter queries, track your personal bookshelf across all devices, and receive an automatic 20% discount on all physical hardcover book orders.',
    },
    {
      q: 'Can I cancel or switch my plan anytime?',
      a: 'Yes! There are no lock-in contracts. You can upgrade from monthly to annual anytime to lock in the 33% discount, or choose not to renew when your billing cycle ends. You will retain all your reading notes and bookmarks forever.',
    },
    {
      q: 'Are the ePub downloads compatible with Kindle and Apple Books?',
      a: 'Absolutely. Every ePub file is packaged in the modern standard ePub3 format, fully compatible with Apple Books, Kindle (via Send-to-Kindle), Kobo, Calibre, and Google Play Books.',
    },
    {
      q: 'How does the AI Reading Tutor work?',
      a: 'Our AI Reading Tutor is powered by Gemini AI with Retrieval-Augmented Grounding (RAG). It has read the verbatim chapters and helps you understand complex vocabulary, provides chapter summaries, answers philosophical questions, and creates customized reading quizzes.',
    },
    {
      q: 'What payment methods are supported?',
      a: 'We accept all major credit and debit cards (Visa, MasterCard, RuPay), UPI (Google Pay, PhonePe, Paytm), and NetBanking via our secure Razorpay gateway.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Active VIP Status Banner */}
        {activeSubscription && (
          <div className="mb-10 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl shadow-md text-white">
                  👑
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1">
                    Active Membership
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    You are a {activeSubscription.planName || 'VIP Member'}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {activeSubscription.expiresAt ? (
                      <>Valid through <strong>{new Date(activeSubscription.expiresAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</strong> ({activeSubscription.daysRemaining || 30} days remaining)</>
                    ) : (
                      'All VIP reading perks and ePub downloads are currently active on your account.'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/bookshelf"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl shadow transition"
                >
                  Go to My Bookshelf
                </Link>
                <Link
                  to="/paidbooks"
                  className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-semibold text-sm rounded-xl shadow transition"
                >
                  Browse Real Catalog
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4 shadow-xs">
            <FiAward className="text-blue-600 dark:text-blue-400" />
            E-Library VIP Pass • Kindle Unlimited Experience
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
            Read Smarter. Read Unlimited.
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Gain immediate, unrestricted access to all 160 real classic & modern books, interactive AI reading tutors, verified DRM-free ePub downloads, and exclusive store privileges.
          </p>

          {/* Billing Interval Switcher */}
          <div className="mt-8 inline-flex items-center p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl shadow-inner border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedBilling('monthly')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                selectedBilling === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setSelectedBilling('annual')}
              className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                selectedBilling === 'annual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Annual Pass</span>
              <span className="bg-amber-400 text-slate-900 text-xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Save 33%
              </span>
            </button>
          </div>
        </div>

        {/* Notice toast */}
        {checkoutNotice.text && (
          <div
            className={`max-w-2xl mx-auto mb-8 p-4 rounded-xl text-sm font-medium border ${
              checkoutNotice.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
            }`}
          >
            {checkoutNotice.text}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
          {/* Card 1: Free Reader */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col justify-between transition hover:shadow-lg">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Standard
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Free Reader</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Perfect for casual readers exploring open public domain previews.
              </p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹0</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">/ forever</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                <li className="flex items-start gap-2.5">
                  <FiCheck className="text-green-500 mt-0.5 shrink-0" />
                  <span>Access to 52 Public Domain Classics</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FiCheck className="text-green-500 mt-0.5 shrink-0" />
                  <span>Basic in-browser chapter reader</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <FiCheck className="text-green-500 mt-0.5 shrink-0" />
                  <span>Browse customer reviews & ratings</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-400 dark:text-slate-500">
                  <FiX className="mt-0.5 shrink-0" />
                  <span>108 Modern Technical & Commercial Books</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-400 dark:text-slate-500">
                  <FiX className="mt-0.5 shrink-0" />
                  <span>Interactive AI Reading Tutor with Quizzes</span>
                </li>
                <li className="flex items-start gap-2.5 text-slate-400 dark:text-slate-500">
                  <FiX className="mt-0.5 shrink-0" />
                  <span>Verified ePub3 File Downloads</span>
                </li>
              </ul>
            </div>
            <Link
              to="/books"
              className="w-full text-center py-3 px-4 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition"
            >
              Explore Free Catalog
            </Link>
          </div>

          {/* Card 2: VIP Reader Monthly */}
          <div
            className={`bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 shadow-xl flex flex-col justify-between relative transition hover:shadow-2xl ${
              selectedBilling === 'monthly'
                ? 'border-blue-600 ring-4 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            {selectedBilling === 'monthly' && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow">
                Most Flexible
              </div>
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                All-Access Pass
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">VIP Reader Monthly</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Unlimited all-you-can-read access to every book, AI features, and ePubs.
              </p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-black text-slate-900 dark:text-white">₹149</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">/ month</span>
              </div>
              <ul className="space-y-3 mb-8 text-sm">
                {monthlyPlan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <FiCheck className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              id="subscribe-monthly-btn"
              disabled={processingPlanId === 'pro_monthly' || (activeSubscription && activeSubscription.planId === 'pro_monthly')}
              onClick={() => handleSubscribe('pro_monthly')}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                activeSubscription && activeSubscription.planId === 'pro_monthly'
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {activeSubscription && activeSubscription.planId === 'pro_monthly' ? (
                <>
                  <FiCheck /> Current Active Plan
                </>
              ) : processingPlanId === 'pro_monthly' ? (
                'Processing...'
              ) : (
                <>
                  <FiZap /> Upgrade to Monthly (₹149)
                </>
              )}
            </button>
          </div>

          {/* Card 3: VIP Scholar Annual */}
          <div
            className={`bg-gradient-to-b from-amber-500/10 to-transparent dark:from-amber-500/20 bg-white dark:bg-slate-800 rounded-3xl p-8 border-2 shadow-2xl flex flex-col justify-between relative transition hover:shadow-2xl ${
              selectedBilling === 'annual'
                ? 'border-amber-500 ring-4 ring-amber-500/20'
                : 'border-amber-400/80 dark:border-amber-600/80'
            }`}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
              👑 Best Value • 33% OFF
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                Ultimate Scholar Tier
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">VIP Scholar Annual</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                365 days of unrestricted reading, priority Gemini AI, and 25% order perks.
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-5xl font-black text-slate-900 dark:text-white">₹1,199</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">/ year</span>
              </div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-6">
                Just ~₹99/month • Save ₹589 annually
              </p>
              <ul className="space-y-3 mb-8 text-sm">
                {annualPlan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 font-medium">
                    <FiCheck className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              id="subscribe-annual-btn"
              disabled={processingPlanId === 'pro_annual' || (activeSubscription && activeSubscription.planId === 'pro_annual')}
              onClick={() => handleSubscribe('pro_annual')}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm shadow-lg transition flex items-center justify-center gap-2 ${
                activeSubscription && activeSubscription.planId === 'pro_annual'
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950'
              }`}
            >
              {activeSubscription && activeSubscription.planId === 'pro_annual' ? (
                <>
                  <FiCheck /> Current Active Plan
                </>
              ) : processingPlanId === 'pro_annual' ? (
                'Processing...'
              ) : (
                <>
                  <FiStar /> Get Annual VIP Pass (₹1,199)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-700 shadow-xl mb-20">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center mb-8">
            Compare Plan Features & Capabilities
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300">Feature</th>
                  <th className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Free Reader</th>
                  <th className="py-4 px-4 font-bold text-blue-600 dark:text-blue-400 text-center">VIP Monthly</th>
                  <th className="py-4 px-4 font-bold text-amber-500 text-center">VIP Scholar (Annual)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                <tr>
                  <td className="py-3.5 px-4 font-medium">Public Domain Classics (52 Titles)</td>
                  <td className="py-3.5 px-4 text-center">✅ Full Access</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">✅ Full Access</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">✅ Full Access</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Modern Technical & Commercial Books (108 Titles)</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Preview Only</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">✅ Unlocked</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">✅ Unlocked</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Interactive In-Browser E-Reader</td>
                  <td className="py-3.5 px-4 text-center">Standard Mode</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">✅ Unlimited Themes & Audio</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">✅ Unlimited Themes & Audio</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Direct ePub & UTF-8 Text Downloads</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">1 per week</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">✅ Unlimited</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">✅ Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Gemini AI Book Tutor & Chapter Quizzes</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">3 queries/day</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">✅ Unlimited Priority RAG</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">✅ Unlimited Priority RAG</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Personal Bookshelf Cloud Sync & Progress</td>
                  <td className="py-3.5 px-4 text-center">Up to 5 books</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">✅ Unlimited Books</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">✅ Unlimited Books</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Physical Book Purchase Discount</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">None</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">20% Auto-Discount</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">25% Auto-Discount</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium">Community Member Distinction</td>
                  <td className="py-3.5 px-4 text-center text-slate-400">Standard Reader</td>
                  <td className="py-3.5 px-4 text-center text-blue-600 font-bold">★ VIP Member</td>
                  <td className="py-3.5 px-4 text-center text-amber-500 font-bold">👑 Golden Scholar Crown</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Member Testimonials */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Loved by 50,000+ Readers & Students
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Here is what our verified subscribers say about E-Library VIP
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex text-amber-400 mb-3">★★★★★</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-4">
                "Having Pride and Prejudice, Frankenstein, and Clean Code all in one clean in-browser reader with AI tutoring has completely transformed how I study. The annual pass is worth 10x its price!"
              </p>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Aarav Sharma</div>
              <div className="text-xs text-slate-500">Computer Science Student • Member for 8 months</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex text-amber-400 mb-3">★★★★★</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-4">
                "The ePub download feature works flawlessly with my Kindle Paperwhite. Direct official Gutenberg texts with verified covers make reading feel so premium."
              </p>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Pooja Patel</div>
              <div className="text-xs text-slate-500">Literature Enthusiast • Annual VIP Pass</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex text-amber-400 mb-3">★★★★★</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic mb-4">
                "The 20% discount on physical book deliveries paid for the monthly membership in my very first order. Highly recommended for any serious reader!"
              </p>
              <div className="font-bold text-sm text-slate-900 dark:text-white">Vikram Malhotra</div>
              <div className="text-xs text-slate-500">Software Engineer • Monthly Subscriber</div>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 font-bold text-slate-900 dark:text-white flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <FiChevronUp className="text-slate-500 shrink-0" /> : <FiChevronDown className="text-slate-500 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Simulated Dev Gateway Modal */}
      {showSimulatedModal && simulatedOrderData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-blue-200 dark:border-blue-900 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
                ⚡
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Razorpay Sandbox Gateway</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Order ID: {simulatedOrderData.orderId}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Ready to activate <strong>{simulatedOrderData.planName}</strong> for <strong>₹{simulatedOrderData.amount / 100}</strong>.
            </p>
            <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs mb-6 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Plan:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{simulatedOrderData.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Amount:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">₹{simulatedOrderData.amount / 100}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Security:</span>
                <span className="font-semibold text-green-600">HMAC-SHA256 Timing-Safe Signature</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSimulatedModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-simulated-payment-btn"
                disabled={processingPlanId !== null}
                onClick={handleConfirmSimulation}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition"
              >
                {processingPlanId ? 'Activating...' : 'Authorize Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Celebration Modal */}
      {successCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl border-2 border-amber-400 text-center animate-scale-in">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-4xl shadow-lg mb-4">
              👑
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              Welcome to the VIP Club!
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Your VIP Membership is now active. You have complete, unrestricted access to read all 160 books online, download ePub files, and ask our AI Tutor anything.
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                to="/paidbooks"
                onClick={() => setSuccessCelebration(false)}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-sm rounded-xl shadow-md transition"
              >
                Start Reading Real Books Now &rarr;
              </Link>
              <Link
                to="/bookshelf"
                onClick={() => setSuccessCelebration(false)}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition"
              >
                View My Bookshelf
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Membership;
