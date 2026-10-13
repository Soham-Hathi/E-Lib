import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isPro: {
        type: Boolean,
        default: false,
    },
    isVerified: { 
        type: Boolean, 
        default: false,
        index: true,
    },
    emailVerifiedAt: {
        type: Date,
        default: null,
    },
    verificationToken: { 
        type: String,
        default: null,
    },
    verificationTokenExpires: {
        type: Date,
        default: null,
    },
    verificationEmailStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'dev_preview'],
        default: 'pending',
    },
    lastVerificationEmailSentAt: {
        type: Date,
        default: null,
    },
    resetPasswordToken: { 
        type: String,
        default: null,
    },
    resetPasswordExpires: { 
        type: Date,
        default: null,
    },
    resetOtp: {
        type: Number,
        default: null,
    },
    resetOtpExpires: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

export default User;
