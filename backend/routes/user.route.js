import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  allUsers, 
  deleteUser, 
  emailotp, 
  login, 
  resetPassword, 
  signup, 
  updateUsers, 
  verifyEmail, 
  confirmVerifyEmail,
  resendVerification, 
  verifyOtp,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  deleteUserAccount,
} from '../controllers/user.controller.js';
import { isAdminMiddleware, authMiddleware } from '../Authenticate/AdminMiddleWare.js';

const router = express.Router();

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: "Too many verification requests. Please try again later." },
});

// Authentication & Verification
router.post('/signup', signup);
router.post('/login', login);
router.post('/resend-verification', resendLimiter, resendVerification);
router.get('/verify-email', verifyEmail);
router.post('/verify-email/confirm', confirmVerifyEmail);

// Password Reset via OTP
router.post('/emailotp', emailotp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Authenticated User Profile & Settings
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);
router.put('/change-password', authMiddleware, changeUserPassword);
router.delete('/account', authMiddleware, deleteUserAccount);

// Admin-only management endpoints
router.get('/getusers', isAdminMiddleware, allUsers);
router.put('/updateuser/:id', isAdminMiddleware, updateUsers);
router.delete('/deleteuser/:id', isAdminMiddleware, deleteUser);

export default router;