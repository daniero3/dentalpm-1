import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Clock, 
  Crown, 
  Lock, 
  Zap, 
  CheckCircle,
  CreditCard,
  Users,
  Building2
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_REACT_APP_BACKEND_URL;

const LicensingGuard = ({ children }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionStatus(response.data);
    } catch (err) {
      console.error('Subscription status check error:', err);
    } finally {
      setLoading(false);
    }
  };

  const PLAN_CONFIGS = {
    ESSENTIAL: {
      name: 'Essential',
      price: '180,000 MGA/mois',
      color: 'blue',
      icon: Users,
      features: ['1-2 praticiens', 'Gestion patients', 'Rendez-vous', 'Facturation MGA']
    },
    PRO: {
      name: 'Pro',
      price: '390,000 MGA/mois', 
      color: 'purple',
      icon: Zap,
      features: ['2-4 praticiens', 'Inventaire avancé', 'Laboratoire', 'Mailing patients', 'Rapports avancés']
    },
    GROUP: {
      name: 'Group',
      price: '790,000 MGA/mois',
      color: 'gold',
      icon: Crown,
      features: ['5+ praticiens', 'Multi-site', 'API access', 'Formation personnalisée', 'Support dédié 24/7']
    }
  };

  if (loading) {
    return children;
  }

  // Super admin bypasses all licensing
  if (subscriptionStatus?.status === 'SUPER_ADMIN') {
    return children;
  }

  // No subscription or clinic
  if (!subscriptionStatus || subscriptionStatus.status === 'NO_SUBSCRIPTION' || subscriptionStatus.status === 'NO_CLINIC') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Accès Restreint</CardTitle>
            <CardDescription>
              Aucun abonnement actif trouvé pour votre compte
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Veuillez contacter votre administrateur pour configurer votre abonnement.
            </p>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Subscription expired
  if (subscriptionStatus.status === 'EXPIRED' || subscriptionStatus.is_expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Abonnement Expiré</CardTitle>
            <CardDescription>
              Votre abonnement a expiré le {new Date(subscriptionStatus.end_date).toLocaleDateString('fr-FR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Votre accès est suspendu. Renouvelez votre abonnement pour continuer à utiliser le service.
              </AlertDescription>
            </Alert>
            
            <div className="text-center space-y-3">
              <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                Renouveler mon abonnement
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/settings/billing'} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Voir la facturation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Trial expired
  if (subscriptionStatus.status === 'TRIAL_EXPIRED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-orange-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle>Période d'Essai Expirée</CardTitle>
            <CardDescription>
              Votre essai gratuit de 14 jours s'est terminé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Pour continuer à utiliser le service, veuillez choisir un plan d'abonnement.
              </AlertDescription>
            </Alert>
            
            <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              Choisir un plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active subscription with warnings
  const showWarnings = () => {
    const warnings = [];

    // Trial warning
    if (subscriptionStatus.is_trial && subscriptionStatus.trial_days_remaining <= 3) {
      warnings.push(
        <Alert key="trial-warning" className="border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Période d'essai:</strong> Il vous reste {subscriptionStatus.trial_days_remaining} jour(s) 
            avant la fin de votre essai gratuit.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2 text-orange-700 underline"
              onClick={() => setShowUpgradeModal(true)}
            >
              Choisir un plan →
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return warnings;
  };

  // Upgrade modal
  const UpgradeModal = () => (
    <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choisissez votre plan</DialogTitle>
          <DialogDescription>
            Sélectionnez le plan qui convient le mieux à votre clinique
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {Object.entries(PLAN_CONFIGS).map(([key, config]) => {
            const Icon = config.icon;
            const isCurrentPlan = subscriptionStatus?.plan === key;

            return (
              <Card key={key} className={`relative ${isCurrentPlan ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:shadow-lg'} transition-all`}>
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Plan Actuel
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className={`mx-auto bg-${config.color}-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4`}>
                    <Icon className={`h-8 w-8 text-${config.color}-600`} />
                  </div>
                  <CardTitle className="text-xl">{config.name}</CardTitle>
                  <CardDescription className="text-2xl font-bold text-gray-900">
                    {config.price}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    disabled={isCurrentPlan}
                    onClick={() => {
                      // Mock upgrade action
                      alert(`Mise à niveau vers ${config.name} - Fonctionnalité à implémenter`);
                    }}
                  >
                    {isCurrentPlan ? 'Plan Actuel' : `Choisir ${config.name}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render children with warnings
  return (
    <>
      {showWarnings().length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
          {showWarnings()}
        </div>
      )}
      
      {children}
      
      <UpgradeModal />
    </>
  );
};

export default LicensingGuard;