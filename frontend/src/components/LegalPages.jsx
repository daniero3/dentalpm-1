import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Shield, 
  Scale, 
  ArrowLeft, 
  Printer,
  Download,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API = process.env.REACT_APP_BACKEND_URL;

const LegalPages = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('cgu');
  const [documents, setDocuments] = useState({
    cgu: { title: '', content: '', loading: true },
    privacy: { title: '', content: '', loading: true },
    mentions: { title: '', content: '', loading: true }
  });

  // Determine active tab from URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('privacy')) setActiveTab('privacy');
    else if (path.includes('mentions')) setActiveTab('mentions');
    else setActiveTab('cgu');
  }, [location]);

  // Fetch documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const [cguRes, privacyRes, mentionsRes] = await Promise.all([
          axios.get(`${API}/api/legal/cgu`),
          axios.get(`${API}/api/legal/privacy`),
          axios.get(`${API}/api/legal/mentions`)
        ]);

        setDocuments({
          cgu: { ...cguRes.data, loading: false },
          privacy: { ...privacyRes.data, loading: false },
          mentions: { ...mentionsRes.data, loading: false }
        });
      } catch (error) {
        console.error('Error fetching legal documents:', error);
      }
    };

    fetchDocuments();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const tabs = [
    { id: 'cgu', label: 'CGU', icon: FileText, path: '/legal/cgu' },
    { id: 'privacy', label: 'Confidentialité', icon: Shield, path: '/legal/privacy' },
    { id: 'mentions', label: 'Mentions légales', icon: Scale, path: '/legal/mentions' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Informations Légales
                </h1>
                <p className="text-sm text-gray-500">
                  Dental PM Madagascar
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(documents).map(([key, doc]) => (
            <TabsContent key={key} value={key}>
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{doc.title}</CardTitle>
                    {doc.lastUpdated && (
                      <span className="text-sm text-gray-500">
                        Mis à jour : {doc.lastUpdated}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 prose prose-slate dark:prose-invert max-w-none">
                      {doc.loading ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <ReactMarkdown>{doc.content}</ReactMarkdown>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  activeTab === tab.id 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-medium ${activeTab === tab.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {tab.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Contact */}
        <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">Une question ?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Contactez notre service juridique : <a href="mailto:legal@dental-madagascar.com" className="text-blue-600 hover:underline">legal@dental-madagascar.com</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
