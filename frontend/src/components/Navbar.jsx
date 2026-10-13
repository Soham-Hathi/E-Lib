import { Link, useNavigate } from 'react-router-dom';
import { IoSunny } from "react-icons/io5";
import { ThemeContext } from '../ThemeContext';
import { useContext, useState } from 'react';
import { CgProfile } from "react-icons/cg";
import { FiShoppingCart, FiUser, FiSettings, FiPackage } from "react-icons/fi";
import { LuMoon } from "react-icons/lu";
import { useCart } from '../context/CartContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { getCartCount } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const token = localStorage.getItem('token');
    const cartCount = getCartCount();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('Book-User-Data');
        setIsMenuOpen(false);
        navigate('/login');
    };

    const handleToggleMenu = () => {
        setIsMenuOpen(prev => !prev);
    };

    const storedUserData = localStorage.getItem('Book-User-Data');
    let user = null;
    try {
        user = storedUserData ? JSON.parse(storedUserData) : null;
    } catch {
        user = null;
    }

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50 dark:bg-gray-800 transition-colors">
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                {/* Logo Section */}
                <div className="flex items-center space-x-6">
                    <Link to='/' className="text-2xl font-bold text-gray-800 dark:text-white hover:text-blue-600 transition">
                        BookStore
                    </Link>
                    <div className="hidden sm:flex items-center space-x-4">
                        <Link to={token ? '/paidbooks' : '/books'} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition">
                            Explore Catalog
                        </Link>
                        <Link to='/discover' className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition">
                            Global Discovery
                        </Link>
                        <Link to='/bookshelf' className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition">
                            My Bookshelf
                        </Link>
                        <Link to='/membership' id="nav-membership-link" className="text-sm font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 transition">
                            <span>👑</span> VIP Pass
                        </Link>
                    </div>
                </div>

                {/* Right Actions Section */}
                <div className="flex items-center space-x-3 sm:space-x-4">
                    {/* Theme Toggle Button */}
                    <button
                        className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                        onClick={toggleTheme}
                        title="Toggle dark/light theme"
                        aria-label="Toggle theme"
                    >
                        {theme === 'dark' ? <IoSunny className="text-xl text-amber-400" /> : <LuMoon className="text-xl text-gray-600" />} 
                    </button>

                    {/* Cart Icon with Item Badge */}
                    <Link
                        to="/cart"
                        id="nav-cart-btn"
                        className="relative p-2 text-gray-600 dark:text-white hover:text-blue-600 transition"
                        title="Shopping Cart"
                        aria-label="View Shopping Cart"
                    >
                        <FiShoppingCart className="text-2xl" />
                        {cartCount > 0 && (
                            <span
                                id="cart-item-badge"
                                className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
                            >
                                {cartCount > 99 ? '99+' : cartCount}
                            </span>
                        )}
                    </Link>

                    {/* Profile and Logout Section */}
                    {token ? (
                        <div className="relative">
                            <button
                                onClick={handleToggleMenu}
                                id="nav-profile-btn"
                                className="flex items-center space-x-2 text-gray-700 dark:text-white hover:text-blue-600 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                title="Account Menu"
                            >
                                <CgProfile className="text-2xl" />
                                <span className="hidden md:inline-block text-sm font-semibold max-w-[120px] truncate">
                                    {user?.fullname || 'My Account'}
                                </span>
                                {user?.isPro && (
                                    <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                                        👑 VIP
                                    </span>
                                )}
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 shadow-xl rounded-xl py-2 z-50 border border-gray-100 dark:border-gray-600">
                                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-600">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                                {user?.fullname || 'My Account'}
                                            </p>
                                            {user?.isPro && (
                                                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                                    VIP
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {user?.email || ''}
                                        </p>
                                    </div>

                                    <Link
                                        to="/profile"
                                        id="nav-dropdown-profile"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                                    >
                                        <FiUser className="text-gray-400" />
                                        Profile
                                    </Link>

                                    <Link
                                        to="/settings"
                                        id="nav-dropdown-settings"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                                    >
                                        <FiSettings className="text-gray-400" />
                                        Settings
                                    </Link>

                                    <Link
                                        to="/bookshelf"
                                        id="nav-dropdown-bookshelf"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                                    >
                                        <span className="text-gray-400">📚</span>
                                        My Bookshelf
                                    </Link>

                                    <Link
                                        to="/membership"
                                        id="nav-dropdown-membership"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition"
                                    >
                                        <span>👑</span>
                                        {user?.isPro ? 'VIP Membership (Active)' : 'Upgrade to VIP Pass'}
                                    </Link>

                                    <Link
                                        to="/myorders"
                                        id="nav-dropdown-orders"
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                                    >
                                        <FiPackage className="text-gray-400" />
                                        My Orders
                                    </Link>

                                    <div className="border-t border-gray-100 dark:border-gray-600 mt-1 pt-1">
                                        <button
                                            id="nav-logout-btn"
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                                        >
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <Link
                                to="/login"
                                className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                            >
                                Sign In
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
