import Footer from "./components/Footer";
import FreeBooks from "./components/FreeBooks";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import { Routes, Route } from 'react-router-dom';
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import PaidBooks from "./components/PaidBooks";
import { ThemeProvider } from "./ThemeContext";
import { CartProvider } from "./context/CartContext";
import ResetPasswordRequest from "./components/ResetPasswordRequest";
import ResetPassword from "./components/ResetPassword";
import OTPInput from "./components/OTPInput";
import OneBook from "./components/OneBook";
import MyOrders from "./components/MyOrders";
import Cart from "./components/Cart";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import AIAssistant from "./components/AIAssistant";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentCancel from "./components/PaymentCancel";
import DiscoverBooks from "./components/DiscoverBooks";
import Reader from "./components/Reader";
import Bookshelf from "./components/Bookshelf";
import Membership from "./components/Membership";

function App() {
  const token = localStorage.getItem('token');

  return (
    <ThemeProvider>
      <CartProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/requestresetpassword" element={<ResetPasswordRequest />} />
          <Route path="/resetpassword" element={<ResetPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/login" element={<Login />} />
          <Route path="/otpinput" element={<OTPInput />} />
          <Route path="/shop/:id" element={<OneBook />} />
          <Route path="/reader/:id" element={<Reader />} />
          <Route path="/bookshelf" element={<Bookshelf />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/myorders" element={<MyOrders />} />
          <Route path="/success" element={<PaymentSuccess />} />
          <Route path="/cancel" element={<PaymentCancel />} />
          <Route path="/paidbooks" element={<PaidBooks />} />
          <Route path="/books" element={<FreeBooks />} />
          <Route path="/discover" element={<DiscoverBooks />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/pricing" element={<Membership />} />
        </Routes>
        <AIAssistant />
        <Footer />
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
