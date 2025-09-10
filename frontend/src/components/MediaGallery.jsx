import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  Eye, 
  Download, 
  Trash2, 
  Image as ImageIcon,
  FileText,
  Camera,
  Stethoscope,
  Filter,
  Grid,
  List
} from 'lucide-react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } = './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
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
  // Set default permissions if not provided
  const { canUpload = true, canDelete = true } = permissions || {};
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleUpload = async (files, type, description) => {
    try {
      setUploading(true);
      const formData = new FormData();
      
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('type', type);
      if (description) {
        formData.append('description', description);
      }

      await axios.post(
        `${BACKEND_URL}/api/media/patients/${patientId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      toast.success('Fichiers uploadés avec succès');
      setShowUploader(false);
      fetchMedia();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
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
        
        {permissions.canUpload && (
          <Button 
            onClick={() => setShowUploader(true)}
            className="medical-gradient"
          >
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

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media Grid/List */}
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
          className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          )}
          layout
        >
          <AnimatePresence>
            {filteredMedia.map((item, index) => (
              <MediaItem
                key={item.id}
                media={item}
                viewMode={viewMode}
                onView={setSelectedMedia}
                onDelete={permissions.canDelete ? handleDelete : null}
                delay={index * 0.1}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploader}
        onClose={() => setShowUploader(false)}
        onUpload={handleUpload}
        uploading={uploading}
      />

      {/* Media Viewer Modal */}
      <MediaViewer
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}

// Individual Media Item Component
function MediaItem({ media, viewMode, onView, onDelete, delay = 0 }) {
  const config = mediaTypeConfig[media.type] || mediaTypeConfig.other;
  const Icon = config.icon;

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay }}
        className="flex items-center p-4 bg-card rounded-lg border hover:shadow-md transition-shadow"
      >
        <div className={cn("p-2 rounded-lg mr-4", config.color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {media.original_name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {config.label} • {formatFileSize(media.file_size)} • 
            {new Date(media.uploaded_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={() => onView(media)}>
            <Eye className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(media.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

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
        {media.mime_type.startsWith('image/') ? (
          <img 
            src={media.url} 
            alt={media.original_name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        
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
          <Button variant="secondary" size="sm" onClick={() => onView(media)}>
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

// Upload Modal Component
function UploadModal({ isOpen, onClose, onUpload, uploading }) {
  const [files, setFiles] = useState([]);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (files.length === 0 || !type) return;
    
    onUpload(files, type, description);
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setType('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter des fichiers</DialogTitle>
          <DialogDescription>
            Uploadez des photos, radiographies ou documents pour ce patient.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">Fichiers</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {files.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de média</Label>
            <Select value={type} onValueChange={setType} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(mediaTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} - {config.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le contenu des fichiers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={files.length === 0 || !type || uploading}
              className="medical-gradient"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploader
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Media Viewer Modal
function MediaViewer({ media, onClose }) {
  if (!media) return null;

  const config = mediaTypeConfig[media.type] || mediaTypeConfig.other;
  const Icon = config.icon;

  return (
    <Dialog open={!!media} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className={cn("p-1 rounded", config.color)}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <span>{media.original_name}</span>
          </DialogTitle>
          <DialogDescription>
            {config.label} • {formatFileSize(media.file_size)} • 
            Uploadé le {new Date(media.uploaded_at).toLocaleDateString('fr-FR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Display */}
          <div className="flex justify-center">
            {media.mime_type.startsWith('image/') ? (
              <img 
                src={media.url} 
                alt={media.original_name}
                className="max-w-full max-h-96 object-contain rounded-lg border"
              />
            ) : (
              <div className="flex flex-col items-center p-8 border rounded-lg">
                <div className={cn("p-4 rounded-full mb-4", config.color)}>
                  <Icon className="h-12 w-12 text-white" />
                </div>
                <p className="text-muted-foreground">
                  Aperçu non disponible pour ce type de fichier
                </p>
              </div>
            )}
          </div>

          {/* Media Details */}
          {media.description && (
            <div>
              <h4 className="font-medium text-foreground mb-2">Description</h4>
              <p className="text-muted-foreground">{media.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" asChild>
              <a href={media.url} download={media.original_name}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};