import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Home, 
  Users, 
  FileText, 
  Calendar, 
  Settings, 
  Package, 
  Truck,
  ShoppingCart,
  FlaskConical,
  Mail,
  ChevronLeft,
  ChevronRight,
  Activity,
  Crown,
  Building2,
  CreditCard,
  LayoutDashboard,
  BarChart3
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

  // Load clinic logo from localStorage or API
  useEffect(() => {
    const savedLogo = localStorage.getItem('clinic_logo')
    if (savedLogo) {
      setClinicLogo(savedLogo)
    }
  }, [])

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 }
  }

  const logoVariants = {
    expanded: { scale: 1, opacity: 1 },
    collapsed: { scale: 0.8, opacity: 0.7 }
  }

  const textVariants = {
    expanded: { opacity: 1, x: 0 },
    collapsed: { opacity: 0, x: -10 }
  }

  return (
    <motion.div
      className="relative flex flex-col bg-card border-r border-border shadow-sm"
      variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <motion.div 
          className="flex items-center space-x-3"
          variants={logoVariants}
          animate={isCollapsed ? "collapsed" : "expanded"}
        >
          {clinicLogo ? (
            <img 
              src={clinicLogo} 
              alt="Logo Clinique" 
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <motion.div 
              className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#0F7E8A] to-[#0a6872] flex items-center justify-center shadow-md"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <ToothIcon className="h-4 w-4" color="white" />
            </motion.div>
          )}
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="font-semibold text-sm text-foreground">
                  Dental Practice
                </span>
                <span className="text-xs text-muted-foreground">
                  Madagascar
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {/* Main Navigation */}
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
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
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center"
                >
                  <Icon className={cn(
                    "h-4 w-4 flex-shrink-0 transition-colors",
                    isActive ? "text-primary-foreground" : ""
                  )} />
                  
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.span
                        variants={textVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                        transition={{ duration: 0.2 }}
                        className="ml-3"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 bg-primary-foreground rounded-r-full"
                    style={{ height: '20px' }}
                  />
                )}
              </Link>
            </motion.div>
          )
        })}

        {/* Billing Section for regular users */}
        {user?.role !== 'SUPER_ADMIN' && (
          <>
            {!isCollapsed && (
              <motion.div 
                className="px-3 py-2 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Abonnement
                </h3>
              </motion.div>
            )}
            {billingNavigation.map((item, index) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (navigation.length + index) * 0.05 }}
                >
                  <Link
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
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center"
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        isActive ? "text-primary-foreground" : ""
                      )} />
                      
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={textVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            transition={{ duration: 0.2 }}
                            className="ml-3"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {isActive && (
                      <motion.div
                        layoutId="activeIndicatorBilling"
                        className="absolute left-0 w-1 bg-primary-foreground rounded-r-full"
                        style={{ height: '20px' }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </>
        )}

        {/* Super Admin Section */}
        {user?.role === 'SUPER_ADMIN' && (
          <>
            {!isCollapsed && (
              <motion.div 
                className="px-3 py-2 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Super Admin
                </h3>
              </motion.div>
            )}
            {adminNavigation.map((item, index) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (navigation.length + billingNavigation.length + index) * 0.05 }}
                >
                  <Link
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
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center"
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors",
                        isActive ? "text-white" : ""
                      )} />
                      
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.span
                            variants={textVariants}
                            initial="collapsed"
                            animate="expanded"
                            exit="collapsed"
                            transition={{ duration: 0.2 }}
                            className="ml-3"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {isActive && (
                      <motion.div
                        layoutId="activeIndicatorAdmin"
                        className="absolute left-0 w-1 bg-white rounded-r-full"
                        style={{ height: '20px' }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <motion.div 
          className="flex items-center space-x-3"
          variants={logoVariants}
          animate={isCollapsed ? "collapsed" : "expanded"}
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-xs font-medium text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0 flex-1"
              >
                <span className="text-sm font-medium text-foreground truncate">
                  {user?.full_name || 'Utilisateur'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.role || 'Rôle'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Status indicator */}
      <motion.div
        className="absolute bottom-2 right-2"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <div className="h-2 w-2 bg-green-500 rounded-full" />
      </motion.div>
    </motion.div>
  )
}