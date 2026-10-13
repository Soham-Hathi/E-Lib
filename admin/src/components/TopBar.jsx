import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiUploadCloud, FiLayers, FiUsers, FiShoppingBag } from 'react-icons/fi';

const TopBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Executive Overview', path: '/dashboard', icon: FiGrid },
    { label: 'Upload Books', path: '/dashboard/uploadbook', icon: FiUploadCloud },
    { label: 'All Books (160)', path: '/dashboard/allbooks', icon: FiLayers },
    { label: 'All Users', path: '/dashboard/allusers', icon: FiUsers },
    { label: 'All Orders', path: '/dashboard/allorders', icon: FiShoppingBag },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700/60 sticky top-16 z-40 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 sm:space-x-2 py-3 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === '/dashboard' && currentPath === '/dashboard/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="text-base" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TopBar;