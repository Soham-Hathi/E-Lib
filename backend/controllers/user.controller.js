import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { emailService } from '../services/email.service.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'fallback_jwt_secret_dev_key';

// Sign-up function
export const signup = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        // Data validation
        if (!fullname || typeof fullname !== 'string' || fullname.trim().length < 2) {
            return res.status(400).json({ message: "Invalid fullname. Must be at least 2 characters." });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email.trim())) {
            return res.status(400).json({ message: "Invalid email format." });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        // Scenario: Account already exists and is verified
        if (existingUser && existingUser.isVerified) {
            return res.status(409).json({
                message: "An account with this email already exists. Please log in instead.",
                isVerified: true,
                email: normalizedEmail,
            });
        }

        const rawToken = emailService.generateToken();
        const hashedToken = emailService.hashToken(rawToken);
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Scenario: Account exists but is unverified (handle gracefully instead of blocking user)
        if (existingUser && !existingUser.isVerified) {
            // Check resend cooldown (60 seconds)
            const now = Date.now();
            if (existingUser.lastVerificationEmailSentAt && (now - existingUser.lastVerificationEmailSentAt.getTime()) < 60 * 1000) {
                const waitSec = Math.ceil((60 * 1000 - (now - existingUser.lastVerificationEmailSentAt.getTime())) / 1000);
                return res.status(200).json({
                    message: "An unverified account already exists. Verification instructions were recently sent.",
                    status: "verification_pending",
                    maskedEmail: emailService.maskEmail(normalizedEmail),
                    email: normalizedEmail,
                    cooldownSeconds: waitSec,
                });
            }

            // Update verification token and password if requested
            const hashedPassword = await bcrypt.hash(password, 10);
            existingUser.fullname = fullname.trim();
            existingUser.password = hashedPassword;
            existingUser.verificationToken = hashedToken;
            existingUser.verificationTokenExpires = tokenExpiry;
            existingUser.lastVerificationEmailSentAt = new Date();
            await existingUser.save();

            const emailResult = await emailService.sendVerificationEmail({
                email: normalizedEmail,
                fullname: existingUser.fullname,
                rawToken,
            });

            existingUser.verificationEmailStatus = emailResult.success ? emailResult.status : 'failed';
            await existingUser.save();

            return res.status(200).json({
                message: "An unverified account already exists. A fresh verification email has been sent.",
                status: "verification_pending",
                maskedEmail: emailService.maskEmail(normalizedEmail),
                email: normalizedEmail,
                previewUrl: emailResult.previewUrl || null,
            });
        }

        // Scenario: Brand new user registration
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullname: fullname.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            isVerified: false,
            verificationToken: hashedToken,
            verificationTokenExpires: tokenExpiry,
            verificationEmailStatus: 'pending',
            lastVerificationEmailSentAt: new Date(),
        });

        await newUser.save();

        // Dispatch verification email
        const emailResult = await emailService.sendVerificationEmail({
            email: normalizedEmail,
            fullname: newUser.fullname,
            rawToken,
        });

        newUser.verificationEmailStatus = emailResult.success ? emailResult.status : 'failed';
        await newUser.save();

        res.status(201).json({
            message: "Account created successfully! Please verify your email to continue.",
            status: "verification_pending",
            maskedEmail: emailService.maskEmail(normalizedEmail),
            email: normalizedEmail,
            previewUrl: emailResult.previewUrl || null,
        });
    } catch (error) {
        console.error("Error creating user:", error.message);
        if (error.code === 11000) {
            return res.status(409).json({
                message: "An account with this email already exists or is being registered. Please log in or verify.",
                isDuplicate: true,
                email: req.body?.email?.trim()?.toLowerCase(),
            });
        }
        res.status(500).json({ message: "Error creating user account.", error: error.message });
    }
};

// Resend verification email function
export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "No account found with this email address." });
        }

        if (user.isVerified) {
            return res.status(400).json({
                message: "This account is already verified. You can log in directly.",
                isVerified: true,
            });
        }

        // Rate limit: 60-second cooldown
        const now = Date.now();
        if (user.lastVerificationEmailSentAt && (now - user.lastVerificationEmailSentAt.getTime()) < 60 * 1000) {
            const waitSeconds = Math.ceil((60 * 1000 - (now - user.lastVerificationEmailSentAt.getTime())) / 1000);
            return res.status(429).json({
                message: `Please wait ${waitSeconds} seconds before requesting another email.`,
                cooldownSeconds: waitSeconds,
            });
        }

        const rawToken = emailService.generateToken();
        user.verificationToken = emailService.hashToken(rawToken);
        user.verificationTokenExpires = new Date(now + 24 * 60 * 60 * 1000);
        user.lastVerificationEmailSentAt = new Date();
        await user.save();

        const emailResult = await emailService.sendVerificationEmail({
            email: normalizedEmail,
            fullname: user.fullname,
            rawToken,
        });

        user.verificationEmailStatus = emailResult.success ? emailResult.status : 'failed';
        await user.save();

        res.status(200).json({
            message: "A fresh verification link has been sent to your email.",
            maskedEmail: emailService.maskEmail(normalizedEmail),
            previewUrl: emailResult.previewUrl || null,
        });
    } catch (error) {
        console.error("Error resending verification:", error.message);
        res.status(500).json({ message: "Failed to resend verification email.", error: error.message });
    }
};

// Email verification entrypoint (GET /user/verify-email)
// Protects against automated email scanners prematurely consuming one-time tokens
export const verifyEmail = async (req, res) => {
    const { token, direct } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!token) {
        return res.status(400).json({ message: 'Verification token is required.' });
    }

    try {
        const hashedToken = emailService.hashToken(token);

        // Lookup user by either hashed token or raw token
        const user = await User.findOne({
            $or: [
                { verificationToken: hashedToken },
                { verificationToken: token },
            ],
        });

        if (!user) {
            if (req.accepts('html')) {
                return res.status(400).send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Invalid Verification Link | E-Library</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 16px; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
                            .card { background: white; max-width: 440px; width: 100%; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
                            h2 { color: #dc2626; margin-top: 0; }
                            p { color: #4b5563; font-size: 14px; line-height: 1.5; }
                            a { display: inline-block; margin-top: 16px; color: #2563eb; text-decoration: underline; font-weight: 500; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h2>Invalid or Expired Link</h2>
                            <p>This verification link is invalid, expired, or has already been used.</p>
                            <a href="${frontendUrl}/login">Return to Login</a>
                        </div>
                    </body>
                    </html>
                `);
            }
            return res.status(400).json({ message: 'Invalid or expired verification token.' });
        }

        // Check token expiration
        if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
            if (req.accepts('html')) {
                return res.status(400).send(`
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>Verification Link Expired | E-Library</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 16px; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
                            .card { background: white; max-width: 440px; width: 100%; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); text-align: center; }
                            h2 { color: #dc2626; margin-top: 0; }
                            p { color: #4b5563; font-size: 14px; line-height: 1.5; }
                            a { display: inline-block; margin-top: 16px; color: #2563eb; text-decoration: underline; font-weight: 500; }
                        </style>
                    </head>
                    <body>
                        <div class="card">
                            <h2>Verification Link Expired</h2>
                            <p>Your verification link has expired. Please sign in or request a new verification email.</p>
                            <a href="${frontendUrl}/login">Return to Login</a>
                        </div>
                    </body>
                    </html>
                `);
            }
            return res.status(400).json({ message: 'Verification link expired.' });
        }

        // If direct parameter is passed or request explicitly prefers JSON, complete verification directly
        const isJsonReq = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
        if (direct === 'true' || isJsonReq) {
            user.isVerified = true;
            user.emailVerifiedAt = new Date();
            user.verificationToken = null;
            user.verificationTokenExpires = null;
            user.verificationEmailStatus = 'sent';
            await user.save();

            if (isJsonReq) {
                return res.status(200).json({
                    message: 'Email verified successfully! You can now log in.',
                    isVerified: true,
                    email: user.email,
                });
            }
            return res.redirect(`${frontendUrl}/login?verified=true`);
        }

        // For standard browser GET requests: render intermediate confirmation screen
        // This avoids consuming one-time tokens solely because automated scanners prefetch links
        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirm Email Verification | E-Library</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 40px 16px; display: flex; align-items: center; justify-content: center; min-height: 80vh; }
                    .card { background: white; max-width: 460px; width: 100%; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); text-align: center; }
                    .badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #eff6ff; color: #2563eb; border-radius: 50%; font-size: 28px; margin-bottom: 20px; }
                    h1 { font-size: 22px; color: #111827; margin: 0 0 12px; }
                    p { font-size: 14px; color: #4b5563; line-height: 1.5; margin: 0 0 24px; }
                    .btn { display: inline-block; width: 100%; box-sizing: border-box; background: #2563eb; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; text-decoration: none; transition: background 0.2s; }
                    .btn:hover { background: #1d4ed8; }
                    .security-note { font-size: 12px; color: #9ca3af; margin-top: 20px; line-height: 1.4; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="badge">✉️</div>
                    <h1>Confirm Email Verification</h1>
                    <p>Hello <strong>${user.fullname}</strong>,<br>Click below to verify <strong>${emailService.maskEmail(user.email)}</strong> and activate your E-Library account.</p>
                    <form action="/user/verify-email/confirm" method="POST">
                        <input type="hidden" name="token" value="${token}" />
                        <button type="submit" class="btn" id="confirm-verify-btn">Verify & Activate Account</button>
                    </form>
                    <p class="security-note">This confirmation step protects your account against automated email scanner prefetching.</p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error("Error verifying email:", error.message);
        res.status(500).json({ message: 'Error verifying email address.', error: error.message });
    }
};

// Confirm verification action (POST /user/verify-email/confirm)
export const confirmVerifyEmail = async (req, res) => {
    const token = req.body.token || req.query.token;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!token) {
        return res.status(400).json({ message: 'Verification token is required.' });
    }

    try {
        const hashedToken = emailService.hashToken(token);

        const user = await User.findOne({
            $or: [
                { verificationToken: hashedToken },
                { verificationToken: token },
            ],
        });

        if (!user) {
            if (req.accepts('html') && !req.xhr && (!req.headers.accept || !req.headers.accept.includes('application/json'))) {
                return res.redirect(`${frontendUrl}/login?error=invalid_token`);
            }
            return res.status(400).json({ message: 'Invalid or expired verification token.' });
        }

        if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
            if (req.accepts('html') && !req.xhr && (!req.headers.accept || !req.headers.accept.includes('application/json'))) {
                return res.redirect(`${frontendUrl}/login?error=expired_token`);
            }
            return res.status(400).json({ message: 'Verification link expired.' });
        }

        // Mark account as verified and consume single-use token
        user.isVerified = true;
        user.emailVerifiedAt = new Date();
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        user.verificationEmailStatus = 'sent';
        await user.save();

        if (req.accepts('html') && !req.xhr && (!req.headers.accept || !req.headers.accept.includes('application/json'))) {
            return res.redirect(`${frontendUrl}/login?verified=true`);
        }

        res.status(200).json({
            message: 'Email verified successfully! You can now log in.',
            isVerified: true,
            email: user.email,
        });
    } catch (error) {
        console.error("Error confirming email verification:", error.message);
        res.status(500).json({ message: 'Error confirming email verification.', error: error.message });
    }
};

// Login function
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password." });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (!existingUser) {
            return res.status(400).json({ message: "User does not exist." });
        }

        if (!existingUser.isVerified) {
            return res.status(403).json({
                message: "Please verify your email before logging in.",
                isVerified: false,
                email: normalizedEmail,
                maskedEmail: emailService.maskEmail(normalizedEmail),
            });
        }

        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid password." });
        }

        const token = jwt.sign(
            { userId: existingUser._id, email: existingUser.email, isAdmin: existingUser.isAdmin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: "Login successful",
            user: {
                _id: existingUser._id,
                fullname: existingUser.fullname,
                email: existingUser.email,
                isAdmin: existingUser.isAdmin,
                isPro: existingUser.isPro,
            },
            token,
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ message: "Error during login.", error: error.message });
    }
};


export const allUsers = async (req,res)=>{
    try {
        const users = await User.find().select('-password');;
        res.status(200).json(users);
    } catch (error) {
        console.log("error: ", error.message);
        res.status(500).json({ message: "Error fetching users", error });
    }
};

// Update user (e.g., to make isAdmin: true)
export const updateUsers = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, // Use $set to update fields explicitly
            { new: true, runValidators: true } // Return the updated user
        );
        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        console.log("Error:", error.message);
        res.status(500).json({ message: "Error: " + error.message }); // Send proper error response
    }
};

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json({ message: "User deleted successfully", user: deletedUser });
    } catch (error) {
        console.log("Error:", error.message);
        res.status(500).json({ message: "Error: " + error.message });
    }
};

export const emailotp = async (req, res) => {
    const { email } = req.body;
  
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ message: 'No account found with this email address.' });
      }

      if (!user.isVerified) {
        return res.status(403).json({ 
          message: 'Please verify your email address before requesting a password reset.',
          isVerified: false,
          maskedEmail: emailService.maskEmail(normalizedEmail),
        });
      }
  
      // Generate a cryptographically secure 6-digit OTP
      const otp = crypto.randomInt(100000, 999999);
  
      // Save the OTP in the user's document (valid for 30 minutes)
      user.resetOtp = otp;
      user.resetOtpExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      await user.save();
  
      // Send OTP using robust emailService
      const emailResult = await emailService.sendPasswordResetOtp({
        email: normalizedEmail,
        fullname: user.fullname,
        otp,
      });
  
      res.status(200).json({ 
        message: 'A 6-digit OTP has been sent to your email address.',
        email: normalizedEmail,
        maskedEmail: emailService.maskEmail(normalizedEmail),
        previewOtp: emailResult.previewOtp || null,
        status: emailResult.status,
      });
    } catch (error) {
      console.error('Password reset OTP error:', error.message);
      res.status(500).json({ message: 'An error occurred while generating password reset OTP.', error: error.message });
    }
  };

  export const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
  
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are both required.' });
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(404).json({ message: 'No account found with this email address.' });
      }

      // Check expiration first
      if (!user.resetOtpExpires || user.resetOtpExpires < new Date()) {
        return res.status(400).json({ 
          message: 'The OTP code has expired (30-minute limit). Please request a fresh OTP.',
          expired: true,
        });
      }

      // Check code match
      if (user.resetOtp !== parseInt(otp, 10)) {
        return res.status(400).json({ 
          message: 'Incorrect OTP code. Please enter the current 6-digit code shown or request a new one.',
          invalid: true,
        });
      }
  
      // Generate a signed token containing userId, OTP, and email
      const token = jwt.sign(
        { userId: user._id, email: user.email, otp: user.resetOtp },
        JWT_SECRET,
        { expiresIn: '30m' } // Valid for 30 minutes
      );
  
      res.status(200).json({ token, message: 'OTP verified successfully' });
    } catch (error) {
      console.error('Verify OTP error:', error.message);
      res.status(500).json({ message: 'An error occurred while verifying OTP.', error: error.message });
    }
  };

  export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
  
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtErr) {
        return res.status(400).json({ message: 'Invalid or expired password reset session. Please request a new OTP.' });
      }

      const user = await User.findById(decoded.userId);
      if (!user || decoded.otp !== user.resetOtp) {
        return res.status(400).json({ message: 'Invalid token or OTP has already been used.' });
      }

      // Hash new password before saving (10 salt rounds)
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      user.resetOtp = null;
      user.resetOtpExpires = null;
      await user.save();
  
      res.status(200).json({ message: 'Password reset successfully! You can now log in.' });
    } catch (error) {
      console.error('Reset password error:', error.message);
      res.status(500).json({ message: 'Failed to reset password.', error: error.message });
    }
  };

  /**
   * Get authenticated user profile (GET /user/profile)
   */
  export const getUserProfile = async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.userId;
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      res.status(200).json({
        user: {
          _id: user._id,
          fullname: user.fullname,
          email: user.email,
          isAdmin: user.isAdmin,
          isPro: user.isPro,
          isVerified: user.isVerified,
          emailVerifiedAt: user.emailVerifiedAt,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error.message);
      res.status(500).json({ message: 'Failed to fetch user profile.', error: error.message });
    }
  };

  /**
   * Update authenticated user profile (PUT /user/profile)
   */
  export const updateUserProfile = async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { fullname } = req.body;

      if (!fullname || typeof fullname !== 'string' || fullname.trim().length < 2) {
        return res.status(400).json({ message: 'Full name must be at least 2 characters.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      user.fullname = fullname.trim();
      await user.save();

      res.status(200).json({
        message: 'Profile updated successfully!',
        user: {
          _id: user._id,
          fullname: user.fullname,
          email: user.email,
          isAdmin: user.isAdmin,
          isPro: user.isPro,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error.message);
      res.status(500).json({ message: 'Failed to update profile.', error: error.message });
    }
  };

  /**
   * Change password for authenticated user (PUT /user/change-password)
   */
  export const changeUserPassword = async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        return res.status(400).json({ message: 'Incorrect current password.' });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      res.status(200).json({ message: 'Password updated successfully!' });
    } catch (error) {
      console.error('Change password error:', error.message);
      res.status(500).json({ message: 'Failed to change password.', error: error.message });
    }
  };

  /**
   * Delete user account (DELETE /user/account)
   */
  export const deleteUserAccount = async (req, res) => {
    try {
      const userId = req.user?._id || req.user?.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required to confirm account deletion.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password. Account deletion aborted.' });
      }

      await User.findByIdAndDelete(userId);
      res.status(200).json({ message: 'Your account has been permanently deleted.' });
    } catch (error) {
      console.error('Delete account error:', error.message);
      res.status(500).json({ message: 'Failed to delete account.', error: error.message });
    }
  };
  