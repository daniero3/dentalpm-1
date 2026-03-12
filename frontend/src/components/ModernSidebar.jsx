import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { 
  Home, Users, FileText, Calendar, Settings, Package, Truck,
  ShoppingCart, FlaskConical, Mail, ChevronLeft,
  Building2, CreditCard, LayoutDashboard, BarChart3
} from "lucide-react"
import { ToothIcon } from "./icons/ToothIcon"
import { Link, useLocation } from "react-router-dom"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import { useAuth } from "../App"

const navigation = [
  { name: "Tableau de bord", href: "/", icon: Home },
  { name: "Patients", href: "/patients", icon: Users },
  { name: "Rendez-vous", href: "/appointments", icon: Calendar },
  { name: "Devis", href: "/quotes", icon: FileText },
  { name: "Factures", href: "/invoices", icon: FileText },
  { name: "Rapports", href: "/reports", icon: BarChart3 },
  { name: "Inventaire", href: "/inventory", icon: Package },
  { name: "Achats", href: "/purchases", icon: ShoppingCart },
  { name: "Fournisseurs", href: "/suppliers", icon: Truck },
  { name: "Laboratoire", href: "/lab", icon: FlaskConical },
  { name: "Mailing", href: "/mailing", icon: Mail },
  { name: "Paramètres", href: "/settings", icon: Settings },
]

const adminNavigation = [
  { name: "Dashboard Admin", href: "/admin", icon: LayoutDashboard },
  { name: "Cliniques", href: "/admin/clinics", icon: Building2 },
  { name: "Validation Paiements", href: "/admin/payments", icon: CreditCard },
]

const billingNavigation = [
  { name: "Paiement/Abonnement", href: "/payment", icon: CreditCard },
]

export function ModernSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [clinicLogo, setClinicLogo] = useState(null)
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    const savedLogo = localStorage.getItem('clinic_logo')
    if (savedLogo) setClinicLogo(savedLogo)
  }, [])

  return (
    <div
      className="relative flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300"
      style={{ width: isCollapsed ? 80 : 280 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3 overflow-hidden">
          {clinicLogo ? (
            <img src={clinicLogo} alt="Logo Clinique" className="h-8 w-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0F7E8A] to-[#0a6872] flex items-center justify-center shadow-md flex-shrink-0">
              <ToothIcon className="h-4 w-4" color="white" />
            </div>
          )}
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">Dental Practice</span>
              <span className="text-xs text-muted-foreground">Madagascar</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-accent flex-shrink-0"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">

        {/* Main Navigation */}
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium",
                "transition-all duration-200 ease-out",
                "hover:bg-[#0F7E8A]/10",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                isActive
                  ? "bg-[#0F7E8A] text-white shadow-md"
                  : "text-gray-600 hover:text-[#0F7E8A]"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                isActive ? "text-white" : "text-gray-500 group-hover:text-[#0F7E8A]"
              )} />
              {!isCollapsed && (
                <span className="ml-3 truncate">{item.name}</span>
              )}
            </Link>
          )
        })}

        {/* Billing Section */}
        {user?.role !== 'SUPER_ADMIN' && (
          <>
            {!isCollapsed && (
              <div className="px-3 py-2 mt-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Abonnement
                </h3>
              </div>
            )}
            {billingNavigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary-foreground" : "")} />
                  {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
                </Link>
              )
            })}
          </>
        )}

        {/* Super Admin Section */}
        {user?.role === 'SUPER_ADMIN' && (
          <>
            {!isCollapsed && (
              <div className="px-3 py-2 mt-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Super Admin
                </h3>
              </div>
            )}
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    isActive
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "")} />
                  {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-foreground truncate">
                {user?.full_name || 'Utilisateur'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.role || 'Rôle'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <motion.div
        className="absolute bottom-2 right-2"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="h-2 w-2 bg-green-500 rounded-full" />
      </motion.div>
    </div>
  )
}
