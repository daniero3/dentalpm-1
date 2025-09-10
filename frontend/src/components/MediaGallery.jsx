import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Eye, 
  Trash2, 
  Image as ImageIcon,
  FileText,
  Camera,
  Stethoscope,
  Filter,
  Grid
} from 'lucide-react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const mediaTypeConfig = {
  profile: {
    label: 'Photo profil',
    icon: Camera,
    color: 'bg-blue-500',
    description: 'Photo de profil du patient'
  },
  xray: {
    label: 'Radiographie',
    icon: Stethoscope,
    color: 'bg-purple-500',
    description: 'Images radiographiques'
  },
  intraoral: {
    label: 'Intra-oral',
    icon: ImageIcon,
    color: 'bg-green-500',
    description: 'Photos intra-orales'
  },
  document: {
    label: 'Document',
    icon: FileText,
    color: 'bg-orange-500',
    description: 'Documents médicaux'
  },
  other: {
    label: 'Autre',
    icon: ImageIcon,
    color: 'bg-gray-500',
    description: 'Autres fichiers'
  }
};

export function MediaGallery({ patientId, patient, permissions }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  
  // Set default permissions if not provided
  const canUpload = permissions?.canUpload !== false;
  const canDelete = permissions?.canDelete !== false;

  useEffect(() => {
    if (patientId) {
      fetchMedia();
    }
  }, [patientId, selectedType]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      
      const response = await axios.get(
        `${BACKEND_URL}/api/media/patients/${patientId}?${params.toString()}`
      );
      setMedia(response.data.media || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error('Erreur lors du chargement des médias');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/api/media/patients/${patientId}/${mediaId}`);
      toast.success('Média supprimé avec succès');
      fetchMedia();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredMedia = selectedType === 'all' 
    ? media 
    : media.filter(item => item.type === selectedType);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Galerie Média</h2>
          <p className="text-muted-foreground mt-1">
            {patient?.full_name && `Patient: ${patient.full_name}`}
          </p>
        </div>
        
        {canUpload && (
          <Button className="medical-gradient">
            <Upload className="h-4 w-4 mr-2" />
            Ajouter des fichiers
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type de média" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(mediaTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Badge variant="outline">
            {filteredMedia.length} fichier{filteredMedia.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Aucun média trouvé</h3>
          <p className="text-muted-foreground mt-2">
            {selectedType === 'all' 
              ? 'Aucun fichier n\'a été uploadé pour ce patient.'
              : `Aucun fichier de type "${mediaTypeConfig[selectedType]?.label}" trouvé.`
            }
          </p>
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          <AnimatePresence>
            {filteredMedia.map((item, index) => (
              <MediaItem
                key={item.id}
                media={item}
                onDelete={canDelete ? handleDelete : null}
                delay={index * 0.1}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// Individual Media Item Component
function MediaItem({ media, onDelete, delay = 0 }) {
  const config = mediaTypeConfig[media.type] || mediaTypeConfig.other;
  const Icon = config.icon;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ delay }}
      className="group relative bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-all duration-200"
    >
      {/* Media Preview */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        {/* Fallback icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className={cn("p-4 rounded-full", config.color)}>
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs">
            {config.label}
          </Badge>
        </div>

        {/* Action overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
          <Button variant="secondary" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onDelete(media.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Media Info */}
      <div className="p-4">
        <h3 className="font-medium text-foreground truncate mb-1">
          {media.original_name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(media.file_size)} • 
          {new Date(media.uploaded_at).toLocaleDateString('fr-FR')}
        </p>
        {media.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {media.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}