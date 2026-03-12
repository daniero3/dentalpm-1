import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { Mail, MessageSquare, Plus, Send, Clock, CheckCircle, XCircle, Calendar, Cake, RefreshCw, Users, FileText } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const MessagingManagement = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ QUEUED: 0, SENT: 0, FAILED: 0 });
  const [loading, setLoading] = useState(true);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ key: '', channel: 'SMS', text: '' });

  const templateKeys = [
    { key: 'APPT_REMINDER_24H', label: 'Rappel RDV 24h', icon: Calendar },
    { key: 'BIRTHDAY',          label: 'Anniversaire',   icon: Cake },
    { key: 'WELCOME',           label: 'Bienvenue',      icon: Users },
    { key: 'CUSTOM',            label: 'Personnalisé',   icon: FileText }
  ];

  const placeholders = ['{patient_name}', '{date}', '{time}', '{clinic_name}'];

  // Helper pour obtenir les headers avec token
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchQueue(), fetchLogs()]);
    setLoading(false);
  };

  const fetchTemplates = async () => {
    try {
      const r = await axios.get(`${API}/messaging/templates`, authHeaders());
      setTemplates(r.data.templates || []);
    } catch (e) {
      console.error('templates:', e);
      setTemplates([]);
    }
  };

  const fetchQueue = async () => {
    try {
      const r = await axios.get(`${API}/messaging/queue`, authHeaders());
      setQueue(r.data.queue || []);
      setStats(r.data.stats || { QUEUED: 0, SENT: 0, FAILED: 0 });
    } catch (e) {
      console.error('queue:', e);
      setQueue([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const r = await axios.get(`${API}/messaging/logs`, authHeaders());
      setLogs(r.data.logs || []);
    } catch (e) {
      console.error('logs:', e);
      setLogs([]);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/messaging/templates`, newTemplate, authHeaders());
      toast.success('Template créé');
      setIsTemplateDialogOpen(false);
      setNewTemplate({ key: '', channel: 'SMS', text: '' });
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur création template');
    }
  };

  const handleRunBirthday = async () => {
    try {
      const r = await axios.post(`${API}/messaging/run-birthday`, {}, authHeaders());
      toast.success(`${r.data.messages_created} message(s) anniversaire créé(s)`);
      fetchQueue();
    } catch (e) {
      toast.error('Erreur job anniversaire');
    }
  };

  const handleRunDispatch = async () => {
    try {
      const r = await axios.post(`${API}/messaging/run-dispatch`, {}, authHeaders());
      toast.success(`Dispatch: ${r.data.sent} envoyé(s), ${r.data.failed} échoué(s)`);
      fetchQueue();
      fetchLogs();
    } catch (e) {
      toast.error('Erreur dispatch');
    }
  };

  const formatDate = (date) => new Date(date).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="bg-gray-300 h-20 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Mail className="h-8 w-8 mr-3 text-purple-600" />Mailing / SMS
          </h1>
          <p className="text-gray-600 mt-1">Gestion des rappels et notifications patients</p>
        </div>
        <Button variant="outline" onClick={fetchAll} data-testid="refresh-btn">
          <RefreshCw className="h-4 w-4 mr-2" />Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
          <p className="text-2xl font-bold">{stats.QUEUED}</p>
          <p className="text-sm text-gray-500">En attente</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">{stats.SENT}</p>
          <p className="text-sm text-gray-500">Envoyés</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <XCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
          <p className="text-2xl font-bold">{stats.FAILED}</p>
          <p className="text-sm text-gray-500">Échoués</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <FileText className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{templates.length}</p>
          <p className="text-sm text-gray-500">Templates</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queue" data-testid="tab-queue">
            <Clock className="h-4 w-4 mr-2" />File d'attente ({queue.length})
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="h-4 w-4 mr-2" />Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            <MessageSquare className="h-4 w-4 mr-2" />Historique ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* Queue */}
        <TabsContent value="queue" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button onClick={handleRunBirthday} variant="outline" data-testid="run-birthday-btn">
              <Cake className="h-4 w-4 mr-2" />Job Anniversaires
            </Button>
            <Button onClick={handleRunDispatch} className="bg-purple-600 hover:bg-purple-700" data-testid="run-dispatch-btn">
              <Send className="h-4 w-4 mr-2" />Exécuter envoi (test)
            </Button>
          </div>
          {queue.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">File d'attente vide</h3>
              <p className="text-gray-500">Aucun message en attente d'envoi</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {queue.map(item => (
                <Card key={item.id} data-testid={`queue-item-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${item.status==='QUEUED'?'bg-amber-100':item.status==='SENT'?'bg-green-100':'bg-red-100'}`}>
                          {item.channel === 'SMS'
                            ? <MessageSquare className={`h-5 w-5 ${item.status==='QUEUED'?'text-amber-600':item.status==='SENT'?'text-green-600':'text-red-600'}`} />
                            : <Mail className={`h-5 w-5 ${item.status==='QUEUED'?'text-amber-600':item.status==='SENT'?'text-green-600':'text-red-600'}`} />
                          }
                        </div>
                        <div>
                          <p className="font-medium">{item.patient?.first_name} {item.patient?.last_name}</p>
                          <p className="text-sm text-gray-500">{item.to}</p>
                          <p className="text-sm text-gray-600 mt-1 max-w-md truncate">{item.text}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={item.status==='QUEUED'?'bg-amber-100 text-amber-800':item.status==='SENT'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}>
                          {item.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">Prévu: {formatDate(item.scheduled_at)}</p>
                        {item.message_type && <Badge variant="outline" className="mt-1">{item.message_type}</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="mb-4" data-testid="new-template-btn">
                <Plus className="h-4 w-4 mr-2" />Nouveau Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Template</DialogTitle>
                <DialogDescription>Créez un modèle de message réutilisable</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div>
                  <Label>Clé du template</Label>
                  <select
                    value={newTemplate.key}
                    onChange={e => setNewTemplate({...newTemplate, key: e.target.value})}
                    className={selectClass}
                    data-testid="template-key-select"
                  >
                    <option value="">Sélectionner...</option>
                    {templateKeys.map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Canal</Label>
                  <select
                    value={newTemplate.channel}
                    onChange={e => setNewTemplate({...newTemplate, channel: e.target.value})}
                    className={selectClass}
                    data-testid="template-channel-select"
                  >
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <Label>Texte du message</Label>
                  <Textarea
                    value={newTemplate.text}
                    onChange={e => setNewTemplate({...newTemplate, text: e.target.value})}
                    placeholder="Bonjour {patient_name}, ..."
                    rows={4}
                    data-testid="template-text"
                  />
                  <p className="text-xs text-gray-500 mt-1">Variables: {placeholders.join(', ')}</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Annuler</Button>
                  <Button type="submit" disabled={!newTemplate.key || !newTemplate.text} data-testid="save-template-btn">Créer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {templates.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">Aucun template</h3>
              <p className="text-gray-500">Créez votre premier modèle de message</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {templates.map(template => {
                const keyInfo = templateKeys.find(t => t.key === template.key) || templateKeys[3];
                return (
                  <Card key={template.id} data-testid={`template-${template.key}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <keyInfo.icon className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{keyInfo.label}</h3>
                              <Badge variant="outline">{template.key}</Badge>
                              <Badge className={template.channel==='SMS'?'bg-blue-100 text-blue-800':'bg-green-100 text-green-800'}>
                                {template.channel}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 max-w-lg">{template.text}</p>
                          </div>
                        </div>
                        <Badge className={template.is_active?'bg-green-100 text-green-800':'bg-gray-100 text-gray-800'}>
                          {template.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-4">
          {logs.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">Aucun historique</h3>
              <p className="text-gray-500">Les messages envoyés apparaîtront ici</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id} data-testid={`log-${log.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${log.status==='SENT'?'bg-green-100':'bg-red-100'}`}>
                          {log.status==='SENT'
                            ? <CheckCircle className="h-5 w-5 text-green-600" />
                            : <XCircle className="h-5 w-5 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="font-medium">{log.patient?.first_name} {log.patient?.last_name}</p>
                          <p className="text-sm text-gray-500">{log.to}</p>
                          <p className="text-sm text-gray-600 mt-1 max-w-md truncate">{log.text}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={log.status==='SENT'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}>
                          {log.status}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(log.sent_at)}</p>
                        <Badge variant="outline" className="mt-1">{log.channel}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MessagingManagement;
