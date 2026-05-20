import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BsXCircleFill } from 'react-icons/bs';

const PaymentCancel = () => {
    const navigate = useNavigate();

    return (
        <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow-lg text-center max-w-lg">
                <BsXCircleFill className="text-red-500 text-6xl mx-auto mb-4" />
                <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Payment Cancelled</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">You have cancelled the checkout process. Don't worry, you haven't been charged.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
                >
                    Back to Store
                </button>
            </div>
        </div>
    );
};

export default PaymentCancel;
