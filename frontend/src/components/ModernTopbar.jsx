import React, { useState } from "react"
import { 
  Search, Bell, User, LogOut, Settings,
  AlertCircle, Calendar, Clock
} from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Badge } from "./ui/badge"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "../App"
import { useNavigate } from "react-router-dom"

const mockNotifications = [
  { id: 1, type: "appointment", title: "Rendez-vous dans 30 minutes", message: "Patient: Marie Rasoarivelo - Consultation", time: "il y a 5 min", unread: true },
  { id: 2, type: "alert", title: "Stock faible", message: "Composite résine A3 - 3 unités restantes", time: "il y a 1h", unread: true },
  { id: 3, type: "system", title: "Sauvegarde terminée", message: "Données sauvegardées avec succès", time: "il y a 2h", unread: false }
]

export function ModernTopbar() {
  const [searchQuery, setSearchQuery]     = useState("")
  const [notifications, setNotifications] = useState(mockNotifications)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const unreadCount = notifications.filter(n => n.unread).length

  const handleLogout = () => { logout(); navigate("/login") }

  const markAsRead = (id) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n))

  const getNotificationIcon = (type) => {
    switch (type) {
      case "appointment": return <Calendar className="h-4 w-4 text-blue-500" />
      case "alert":       return <AlertCircle className="h-4 w-4 text-amber-500" />
      default:            return <Clock className="h-4 w-4 text-green-500" />
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">

        {/* Search */}
        <div className="flex flex-1 items-center space-x-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher patients, factures..."
              className="pl-10 pr-4 bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-ring transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex items-start space-x-3 p-3 cursor-pointer"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                        {notification.unread && <div className="h-2 w-2 bg-primary rounded-full ml-2" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-sm text-muted-foreground">
                Voir toutes les notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.full_name || 'Utilisateur'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email || 'email@example.com'}</p>
                  <Badge variant="outline" className="w-fit mt-1">{user?.role || 'Utilisateur'}</Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" /><span>Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /><span>Paramètres</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" /><span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
