import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CreditCard, Clock, Lock, RefreshCw } from 'lucide-react';

const SubscriptionExpiredPage = ({ errorData, onRetry, onLogout }) => {
  const { code, message, expired_date, action } = errorData || {};

  const getIcon = () => {
    switch (code) {
      case 'SUBSCRIPTION_EXPIRED':
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
      case 'TRIAL_EXPIRED':
        return <Clock className="h-12 w-12 text-orange-500" />;
      case 'NO_ACTIVE_SUBSCRIPTION':
        return <Lock className="h-12 w-12 text-gray-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-red-500" />;
    }
  };

  const getTitle = () => {
    switch (code) {
      case 'SUBSCRIPTION_EXPIRED':
        return 'Abonnement Expiré';
      case 'TRIAL_EXPIRED':
        return 'Essai Terminé';
      case 'NO_ACTIVE_SUBSCRIPTION':
        return 'Abonnement Requis';
      default:
        return 'Accès Restreint';
    }
  };

  const getDescription = () => {
    if (message) return message;
    switch (code) {
      case 'SUBSCRIPTION_EXPIRED':
        return `Votre abonnement a expiré${expired_date ? ` le ${new Date(expired_date).toLocaleDateString('fr-FR')}` : ''}.`;
      case 'TRIAL_EXPIRED':
        return 'Votre période d\'essai gratuite est terminée.';
      case 'NO_ACTIVE_SUBSCRIPTION':
        return 'Aucun abonnement actif n\'est associé à votre compte.';
      default:
        return 'Vous n\'avez pas accès à cette ressource.';
    }
  };

  const getActionButton = () => {
    if (action === 'renew' || code === 'SUBSCRIPTION_EXPIRED') {
      return (
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={() => window.location.href = '/billing/payment'}
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Renouveler mon abonnement
        </Button>
      );
    }
    return (
      <Button 
        className="w-full bg-green-600 hover:bg-green-700"
        onClick={() => window.location.href = '/billing/payment'}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Souscrire à un plan
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          <CardDescription className="text-base mt-2">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Votre accès aux fonctionnalités est suspendu jusqu'au renouvellement.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {getActionButton()}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full text-gray-500"
              onClick={onLogout}
            >
              Se déconnecter
            </Button>
          </div>

          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-500">
              Besoin d'aide ? Contactez le support à{' '}
              <a href="mailto:support@dental-madagascar.com" className="text-blue-600 hover:underline">
                support@dental-madagascar.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpiredPage;
