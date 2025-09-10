import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Users, 
  FileText, 
  DollarSign, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Activity,
  CreditCard
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_patients: 0,
    total_invoices: 0,
    pending_payments: 0,
    total_revenue_mga: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statsCards = [
    {
      title: 'Total Patients',
      value: stats.total_patients,
      description: 'Patients enregistrés',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Factures Émises',
      value: stats.total_invoices,
      description: 'Ce mois-ci',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.total_revenue_mga),
      description: 'Revenus totaux',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+15%',
      changeColor: 'text-green-600'
    },
    {
      title: 'Paiements en attente',
      value: stats.pending_payments,
      description: 'Factures impayées',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '-3%',
      changeColor: 'text-green-600'
    }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-300 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {getGreeting()}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-gray-600 mt-1">
            Voici un aperçu de votre cabinet dentaire aujourd'hui
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {stat.description}
                  </p>
                  <Badge variant="secondary" className={`${stat.changeColor} bg-transparent`}>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {stat.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-blue-600" />
              Activité récente
            </CardTitle>
            <CardDescription>
              Dernières actions effectuées dans le système
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nouveau patient enregistré</p>
                <p className="text-xs text-gray-500">Marie Rakoto - Il y a 2 heures</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Facture générée</p>
                <p className="text-xs text-gray-500">FACT-000123 - 85,000 MGA</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Paiement reçu</p>
                <p className="text-xs text-gray-500">Jean Ratsimbazafy - Mvola</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Aujourd'hui
            </CardTitle>
            <CardDescription>
              Rendez-vous et tâches du jour
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500 mb-2">
                Système de rendez-vous bientôt disponible
              </p>
              <Badge variant="outline">
                Fonctionnalité en développement
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message for New Users */}
      {stats.total_patients === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">
              Bienvenue dans votre système de gestion dentaire !
            </CardTitle>
            <CardDescription className="text-blue-700">
              Commencez par ajouter vos premiers patients pour utiliser toutes les fonctionnalités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="bg-white p-4 rounded-lg flex-1">
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-blue-900">Gestion des patients</h3>
                <p className="text-sm text-blue-700">
                  Enregistrez les informations médicales et personnelles
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg flex-1">
                <FileText className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-semibold text-blue-900">Facturation en MGA</h3>
                <p className="text-sm text-blue-700">
                  Créez des factures conformes aux standards malgaches
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;