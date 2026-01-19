import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Building2
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentValidationPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null); // 'verify' or 'reject'
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/payment-requests?status=PENDING`);
      setRequests(response.data.paymentRequests || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    if (actionType === 'reject' && !note.trim()) {
      toast.error('Motif de rejet requis');
      return;
    }

    setProcessing(true);
    try {
      const endpoint = actionType === 'verify' 
        ? `${API}/admin/payment-requests/${selectedRequest.id}/verify`
        : `${API}/admin/payment-requests/${selectedRequest.id}/reject`;

      await axios.patch(endpoint, { note_admin: note });

      toast.success(actionType === 'verify' ? 'Paiement vérifié' : 'Demande rejetée');
      setSelectedRequest(null);
      setActionType(null);
      setNote('');
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    } finally {
      setProcessing(false);
    }
  };

  const openDialog = (request, type) => {
    setSelectedRequest(request);
    setActionType(type);
    setNote('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payment-validation-page">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Validation des paiements
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vérifiez les preuves de paiement des cliniques
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune demande en attente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map(req => (
            <Card key={req.id} data-testid={`request-card-${req.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{req.clinic?.name || 'Clinique'}</span>
                      <Badge variant="secondary">{req.plan_code}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Montant:</span>
                        <span className="ml-1 font-medium">{req.amount_mga?.toLocaleString()} MGA</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Méthode:</span>
                        <span className="ml-1">{req.payment_method}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Référence:</span>
                        <span className="ml-1 font-mono">{req.reference || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date:</span>
                        <span className="ml-1">{new Date(req.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {req.receipt_url && (
                      <a 
                        href={`${process.env.REACT_APP_BACKEND_URL}${req.receipt_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                      >
                        <Eye className="h-3 w-3" />
                        Voir le reçu
                      </a>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      Soumis par: {req.submittedBy?.full_name || req.submittedBy?.email || 'Inconnu'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => openDialog(req, 'reject')}
                      data-testid={`reject-btn-${req.id}`}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                    <Button
                      onClick={() => openDialog(req, 'verify')}
                      data-testid={`verify-btn-${req.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Vérifier
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={actionType === 'verify' ? 'text-green-600' : 'text-red-600'}>
              {actionType === 'verify' ? 'Vérifier le paiement' : 'Rejeter la demande'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'verify' 
                ? 'Cette action activera l\'abonnement de la clinique pour 30 jours.'
                : 'Indiquez le motif du rejet.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="py-4">
              <div className="bg-muted/50 p-3 rounded-lg mb-4">
                <p className="font-medium">{selectedRequest.clinic?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.plan_code} - {selectedRequest.amount_mga?.toLocaleString()} MGA
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest.payment_method} • {selectedRequest.reference || 'Sans référence'}
                </p>
              </div>

              <div>
                <Label htmlFor="note">
                  {actionType === 'verify' ? 'Note (optionnel)' : 'Motif du rejet *'}
                </Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={actionType === 'verify' 
                    ? 'Note optionnelle...'
                    : 'Expliquez pourquoi la demande est rejetée...'}
                  rows={3}
                  data-testid="note-textarea"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionType === 'verify' ? 'default' : 'destructive'}
              data-testid="confirm-action-btn"
            >
              {processing ? 'Traitement...' : (actionType === 'verify' ? 'Confirmer la vérification' : 'Confirmer le rejet')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentValidationPage;
