import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { 
  Stethoscope, 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  Home,
  Activity,
  Receipt
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    {
      name: 'Tableau de bord',
      href: '/',
      icon: Home,
      exact: true
    },
    {
      name: 'Patients',
      href: '/patients',
      icon: Users,
    },
    {
      name: 'Factures',
      href: '/invoices',
      icon: Receipt,
    },
    // {
    //   name: 'Rendez-vous',
    //   href: '/appointments',
    //   icon: Calendar,
    // },
    // {
    //   name: 'Rapports',
    //   href: '/reports',
    //   icon: BarChart3,
    // },
    // {
    //   name: 'Paramètres',
    //   href: '/settings',
    //   icon: Settings,
    // },
  ];

  const isActive = (href, exact = false) => {
    if (exact) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="bg-white shadow-lg h-full w-64 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Stethoscope className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">Cabinet Dentaire</h1>
            <p className="text-sm text-gray-500">Madagascar</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-2">
            <span className="text-white font-semibold text-sm">
              {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">
              {user?.role === 'dentist' && 'Dentiste'}
              {user?.role === 'secretary' && 'Secrétaire'}
              {user?.role === 'accountant' && 'Comptable'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href, item.exact)
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Dashboard SUPER_ADMIN */}
      {user?.role === 'SUPER_ADMIN' && (
        <div className="px-3 pb-2">
          <NavLink to="/super-admin"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-bold rounded-lg transition-colors ${
                isActive ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`
            }
          >
            <span style={{ marginRight:10, fontSize:16 }}>💰</span>
            Dashboard Revenus
          </NavLink>
        </div>
      )}

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full flex items-center justify-start px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
