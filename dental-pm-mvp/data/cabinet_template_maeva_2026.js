/**
 * Template MAEVA 2026 - Tarification CABINET exemple
 * Import disponible en 1 clic pour les cliniques
 */

const CABINET_TEMPLATE_MAEVA_2026 = [
  // Consultation
  { procedure_code: 'C01', label: 'Consultation', price_mga: 35000, category: 'Consultation' },
  { procedure_code: 'C02', label: 'Consultation approfondie', price_mga: 75000, category: 'Consultation' },
  
  // Soins
  { procedure_code: 'TS01', label: 'Soins dentaires, dent de lait', price_mga: 78500, category: 'Soins' },
  { procedure_code: 'TS02', label: 'Reconstitution coronaire, sandwich', price_mga: 148000, category: 'Soins' },
  { procedure_code: 'TS03', label: 'Reconstitution coronaire complexe', price_mga: 176000, category: 'Soins' },
  { procedure_code: 'TS04', label: 'Endo, monoradiculaire', price_mga: 205000, category: 'Soins' },
  { procedure_code: 'TS05', label: 'Endo, Prémolaire', price_mga: 246000, category: 'Soins' },
  { procedure_code: 'TS06', label: 'Endo, Molaire', price_mga: 268000, category: 'Soins' },
  
  // Paro
  { procedure_code: 'TP01', label: 'Détartrage complet', price_mga: 150000, category: 'Paro' },
  { procedure_code: 'TP02', label: 'Détartrage PREMIUM', price_mga: 1850000, category: 'Paro' },
  { procedure_code: 'TP03', label: 'Curetage, surfaçage, par intervention', price_mga: 100000, category: 'Paro' },
  
  // Extraction
  { procedure_code: 'TE01', label: 'Extraction dent de lait', price_mga: 80000, category: 'Extraction' },
  { procedure_code: 'TE02', label: 'Extraction, dent monoradiculaire', price_mga: 100000, category: 'Extraction' },
  { procedure_code: 'TE03', label: 'Extraction, dent pluriradiculaire', price_mga: 120000, category: 'Extraction' },
  { procedure_code: 'TE04', label: 'Extraction DS', price_mga: 250000, category: 'Extraction' },
  { procedure_code: 'TE05', label: 'Extraction DS incluse', price_mga: 450000, category: 'Extraction' },
  { procedure_code: 'TE06', label: 'Curetage alvéolaire sans suture', price_mga: 100000, category: 'Extraction' },
  { procedure_code: 'TE07', label: 'Curetage alvéolaire avec suture', price_mga: 120000, category: 'Extraction' },
  
  // Prothèses amovibles
  { procedure_code: 'TPA01', label: 'PAP en résine 1 à 5 dents', price_mga: 350000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA02', label: 'PAP en résine 6 à 10 dents', price_mga: 650000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA03', label: 'PAP en résine 10 dents et plus', price_mga: 950000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA04', label: 'Flexite 01 à 06 dents', price_mga: 1550000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA05', label: 'Flexite 06 dents et plus', price_mga: 1850000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA06', label: 'Transparent rigide 01 à 06 dents', price_mga: 1750000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA07', label: 'Transparent rigide 06 dents et plus', price_mga: 1950000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA08', label: 'Transparent rigide Total', price_mga: 2100000, category: 'Prothèses amovibles' },
  { procedure_code: 'TPA09', label: 'Rebasage', price_mga: 100000, category: 'Prothèses amovibles' },
  
  // ODF
  { procedure_code: 'TO01', label: "Examen avec prise d'empreinte", price_mga: 643500, category: 'ODF' },
  { procedure_code: 'TO02', label: 'Traitement actif des dysmorphoses (Mensualité)', price_mga: 350000, category: 'ODF' },
  { procedure_code: 'TO03', label: "Retrait de l'appareil", price_mga: 350000, category: 'ODF' },
  { procedure_code: 'TO04', label: 'Contension par arcade', price_mga: 350000, category: 'ODF' },
  
  // Aligneur invisible
  { procedure_code: 'TA01', label: 'Etude, diagnostic, plan de traitement', price_mga: 643500, category: 'Aligneur invisible' },
  { procedure_code: 'TA02', label: 'Préparation, pose tacket, gout N°1 et 2 H/B', price_mga: 5850000, category: 'Aligneur invisible' },
  { procedure_code: 'TA03', label: 'Gouttière aligneur transparent', price_mga: 540000, category: 'Aligneur invisible' },
  { procedure_code: 'TA04', label: 'Gouttière de contension', price_mga: 560000, category: 'Aligneur invisible' },
  
  // Blanchiment dentaire
  { procedure_code: 'TB01', label: "Etude, examen avec prise d'empreinte", price_mga: 235000, category: 'Blanchiment dentaire' },
  { procedure_code: 'TB02', label: 'Gouttière de blanchiment dentaire', price_mga: 425000, category: 'Blanchiment dentaire' },
  { procedure_code: 'TB03', label: 'Produits de blanchiments', price_mga: 682000, category: 'Blanchiment dentaire' },
  
  // Prothèse Conjointe
  { procedure_code: 'TPC01', label: 'Jacket résine', price_mga: 475000, category: 'Prothèse Conjointe' },
  { procedure_code: 'TPC02', label: 'Inlay core', price_mga: 355000, category: 'Prothèse Conjointe' },
  { procedure_code: 'TPC03', label: 'Rescellement', price_mga: 148000, category: 'Prothèse Conjointe' },
  { procedure_code: 'TPC04', label: 'Recollage bridge par pilier', price_mga: 123500, category: 'Prothèse Conjointe' },
  { procedure_code: 'TPC05', label: 'Couronne/bridge céramo-métallique', price_mga: 950000, category: 'Prothèse Conjointe' },
  { procedure_code: 'TPC06', label: 'Couronne/bridge en zircone', price_mga: 1624000, category: 'Prothèse Conjointe' },
  
  // Implant dentaire
  { procedure_code: 'TI01', label: 'Etude faisabilité', price_mga: 643500, category: 'Implant dentaire' },
  { procedure_code: 'TI02', label: 'Implant dentaire', price_mga: 3245000, category: 'Implant dentaire' },
  { procedure_code: 'TI03', label: 'Pilier prothétique', price_mga: 485000, category: 'Implant dentaire' },
  { procedure_code: 'TI04', label: 'Bridge / couronne implanto-portée', price_mga: 1774000, category: 'Implant dentaire' }
];

module.exports = { CABINET_TEMPLATE_MAEVA_2026 };
