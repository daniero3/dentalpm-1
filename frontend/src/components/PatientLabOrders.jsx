import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { FlaskConical, ArrowLeft, User, Loader2, Printer, Clock, CheckCircle, XCircle, RefreshCw, ArrowRight } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WORK_TYPES = {
  CROWN: 'Couronne', BRIDGE: 'Bridge', PARTIAL_DENTURE: 'Prothèse partielle',
  COMPLETE_DENTURE: 'Prothèse complète', IMPLANT_CROWN: 'Couronne implant',
  ORTHODONTIC_APPLIANCE: 'Orthodontie', NIGHT_GUARD: 'Gouttière',
  VENEER: 'Facette', INLAY_ONLAY: 'Inlay/Onlay', OTHER: 'Autre'
};

const STATUS_CONFIG = {
  CREATED: { label: 'Créée', color: 'bg-gray-200 text-gray-700', icon: Clock },
  SENT: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700', icon: ArrowRight },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  DELIVERED: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const PatientLabOrders = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatient();
    fetchOrders();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}`);
      setPatient(res.data);
    } catch (err) {
      toast.error('Patient non trouvé');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}/lab-orders`);
      setOrders(res.data.orders || []);
    } catch (err) {
      toast.error('Erreur chargement commandes');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (orderId) => {
    window.open(`${API}/labs/orders/${orderId}/print`, '_blank');
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' MGA';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="patient-lab-orders">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-purple-600" />
              Commandes Labo
            </h1>
            {patient && (
              <p className="text-gray-500 flex items-center gap-1">
                <User className="h-4 w-4" />
                {patient.first_name} {patient.last_name}
              </p>
            )}
          </div>
        </div>
        <Link to="/lab">
          <Button>Voir toutes les commandes</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{orders.length} commande(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucune commande labo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.CREATED;
                const StatusIcon = statusConfig.icon;
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${statusConfig.color}`}>
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-gray-500">{WORK_TYPES[order.work_type]} • {formatDate(order.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      <span className="text-sm">{formatCurrency(order.total_mga)}</span>
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(order.id)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientLabOrders;
