import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BsCheckCircleFill } from 'react-icons/bs';
import { API_BASE_URL } from '../config/api';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('Processing your order...');
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        const finalizeOrder = async () => {
            const pendingOrderStr = localStorage.getItem('pendingOrderData');
            if (pendingOrderStr) {
                try {
                    const orderData = JSON.parse(pendingOrderStr);
                    // Override payment method naming if desired or keep as stripe_card
                    orderData.paymentMethod = 'Card (Stripe)';
                    
                    const response = await axios.post(`${API_BASE_URL}/order/placeorder`, orderData);
                    setStatus('Payment Successful! Your order has been placed and email sent.');
                    localStorage.removeItem('pendingOrderData');
                } catch (error) {
                    console.error("Error finalizing order:", error);
                    setStatus('Payment succeeded, but we failed to record your order. Please contact support.');
                }
            } else {
                setStatus('Payment Successful! (No pending order data found)');
            }
        };

        finalizeOrder();
    }, []);

    return (
        <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg text-center max-w-lg">
                <BsCheckCircleFill className="text-green-500 text-6xl mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Success!</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">{status}</p>
                <button 
                    onClick={() => navigate('/')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
                >
                    Continue Shopping
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccess;
