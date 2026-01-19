// TARIF SYNDICAL MADAGASCAR 2026 - Données officielles
// Source: TARIF ET NOMENCLATURE 2026.pdf

// Valeurs de base des lettres-clés (MGA)
const LETTER_VALUES = {
  C: 35000,    // Consultation omnipraticien
  Cs: 50000,   // Consultation spécialiste
  SC: 3500,    // Soins conservateurs
  TC: 3500,    // Traitement chirurgical
  TP: 3500,    // Traitement parodontal
  TO: 5000,    // Traitement orthodontique
  PC: 4500,    // Prothèse conjointe
  PA: 4500,    // Prothèse adjointe
  Ti: 6000,    // Implantologie
  X: 3500      // Radiologie
};

// Nomenclature complète SYNDICAL 2026
const SYNDICAL_2026_FEES = [
  // CONSULTATIONS
  { procedure_code: 'C', label: 'Consultation au cabinet par l\'Odonto-Stomatologiste omnipraticien', price_mga: 35000, category: 'CONSULTATION' },
  { procedure_code: 'Cs', label: 'Consultation au cabinet par l\'Odonto-Stomatologiste spécialisé', price_mga: 50000, category: 'CONSULTATION' },
  { procedure_code: 'EXP', label: 'Examen de prévention bucco-dentaire', price_mga: 50000, category: 'CONSULTATION' },
  { procedure_code: 'V', label: 'Visite au domicile du malade (omnipraticien)', price_mga: 30000, category: 'CONSULTATION' },
  { procedure_code: 'Vs', label: 'Visite au domicile du malade (spécialiste)', price_mga: 50000, category: 'CONSULTATION' },
  { procedure_code: 'IFD', label: 'Indemnité forfaitaire de déplacement', price_mga: 50000, category: 'CONSULTATION' },
  { procedure_code: 'MNFD', label: 'Majoration de nuit, dimanche et jours fériés', price_mga: 50000, category: 'CONSULTATION' },

  // SOINS CONSERVATEURS (SC x coefficient)
  { procedure_code: 'SC40', label: 'Obturation simple', price_mga: 140000, category: 'SOINS_CONSERVATEURS' },
  { procedure_code: 'SC55', label: 'Obturation technique Sandwich', price_mga: 192500, category: 'SOINS_CONSERVATEURS' },
  { procedure_code: 'SC59', label: 'Obturation incisive/canine', price_mga: 206500, category: 'SOINS_CONSERVATEURS' },
  { procedure_code: 'SC63', label: 'Obturation prémolaire', price_mga: 220500, category: 'SOINS_CONSERVATEURS' },
  { procedure_code: 'SC67', label: 'Obturation molaire', price_mga: 234500, category: 'SOINS_CONSERVATEURS' },
  { procedure_code: 'SC12', label: 'Désensibilisation collet, par séance', price_mga: 42000, category: 'SOINS_CONSERVATEURS' },
  { procedure_code: 'SC20', label: 'Scellement des puits et fissures', price_mga: 70000, category: 'SOINS_CONSERVATEURS' },

  // PARODONTOLOGIE (TP x coefficient)
  { procedure_code: 'TP12', label: 'Enseignement brossage et motivation hygiène (par séance)', price_mga: 42000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP25', label: 'Détartrage complet par séance (3 séances max)', price_mga: 87500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP18', label: 'Papillectomie par dent', price_mga: 63000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP35', label: 'Gingivectomie-gingivoplastie partielle', price_mga: 122500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP45', label: 'Gingivectomie hémi-arcade ou canine à canine', price_mga: 157500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP30', label: 'Curetage et surfaçage, par intervention', price_mga: 105000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP38', label: 'ENAP, par intervention', price_mga: 133000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP50', label: 'Intervention à lambeau', price_mga: 175000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP41', label: 'Frénectomie', price_mga: 143500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP57', label: 'Vestibuloplastie, approfondissement vestibulaire', price_mga: 199500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP55', label: 'Lambeau positionné coronairement', price_mga: 192500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP70', label: 'Greffe gingivale libre, par dent', price_mga: 245000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP52', label: 'Lambeau positionné latéralement, par dent', price_mga: 182000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP40', label: 'Séparation radiculaire avec curetage', price_mga: 140000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP28', label: 'Amputation radiculaire avec curetage', price_mga: 98000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP42', label: 'Tunnelisation, par dent', price_mga: 147000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP65', label: 'Ligature métallique', price_mga: 227500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP180', label: 'Attelle métallique coulée canine à canine', price_mga: 630000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP21', label: 'Équilibration occlusale, par séance', price_mga: 73500, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP44', label: 'Plan rétro-incisif', price_mga: 154000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP112', label: 'Gouttière pour SADAM', price_mga: 392000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP62', label: 'Rebasage de prothèse existante', price_mga: 217000, category: 'PARODONTOLOGIE' },
  { procedure_code: 'TP43', label: 'Réduction manuelle luxation ATM', price_mga: 150500, category: 'PARODONTOLOGIE' },

  // EXTRACTIONS (TC x coefficient)
  { procedure_code: 'TC15', label: 'Extraction incisive', price_mga: 52500, category: 'EXTRACTION' },
  { procedure_code: 'TC20', label: 'Extraction canine', price_mga: 70000, category: 'EXTRACTION' },
  { procedure_code: 'TC18', label: 'Extraction prémolaire', price_mga: 63000, category: 'EXTRACTION' },
  { procedure_code: 'TC25', label: 'Extraction molaire', price_mga: 87500, category: 'EXTRACTION' },
  { procedure_code: 'TC12', label: 'Dent de lait mobile sous Cryo-anesthésie', price_mga: 42000, category: 'EXTRACTION' },
  { procedure_code: 'TC17', label: 'Odontoïde ou dent surnuméraire non incluse', price_mga: 59500, category: 'EXTRACTION' },
  { procedure_code: 'TC30', label: 'Extraction avec séparation des racines', price_mga: 105000, category: 'EXTRACTION' },
  { procedure_code: 'TC35', label: 'Alvéolectomie dent non ectopique', price_mga: 122500, category: 'EXTRACTION' },
  { procedure_code: 'TC50', label: 'Alvéolectomie dent ectopique', price_mga: 175000, category: 'EXTRACTION' },
  { procedure_code: 'TC60', label: 'Dent incluse ou enclavée (autre que canine/sagesse)', price_mga: 210000, category: 'EXTRACTION' },
  { procedure_code: 'TC65', label: 'Canine incluse', price_mga: 227500, category: 'EXTRACTION' },
  { procedure_code: 'TC80', label: 'Dent de sagesse incluse ou enclavée', price_mga: 280000, category: 'EXTRACTION' },
  { procedure_code: 'TC42', label: 'Odontoïde ou surnuméraire incluse', price_mga: 147000, category: 'EXTRACTION' },
  { procedure_code: 'TC90', label: 'Germectomie', price_mga: 315000, category: 'EXTRACTION' },
  { procedure_code: 'TC36', label: 'Extractions multiples 1 à 5 dents', price_mga: 126000, category: 'EXTRACTION' },
  { procedure_code: 'TC41', label: 'Extractions multiples 6 à 12 dents', price_mga: 143500, category: 'EXTRACTION' },
  { procedure_code: 'TC46', label: 'Extractions multiples 13+ dents', price_mga: 161000, category: 'EXTRACTION' },
  { procedure_code: 'TC75', label: 'Extraction sous AL en bloc opératoire, supplément', price_mga: 262500, category: 'EXTRACTION' },

  // CHIRURGIE (TC x coefficient)
  { procedure_code: 'TC16', label: 'Hémorragie post-opératoire sans suture', price_mga: 56000, category: 'CHIRURGIE' },
  { procedure_code: 'TC38', label: 'Hémorragie post-opératoire avec suture', price_mga: 133000, category: 'CHIRURGIE' },
  { procedure_code: 'TC23', label: 'Curetage alvéolaire post-op sans suture', price_mga: 80500, category: 'CHIRURGIE' },
  { procedure_code: 'TC45', label: 'Curetage alvéolaire post-op avec suture', price_mga: 157500, category: 'CHIRURGIE' },
  { procedure_code: 'TC11', label: 'Alvéolite, par séance', price_mga: 38500, category: 'CHIRURGIE' },
  { procedure_code: 'TC43', label: 'Dégagement chirurgical couronne dent incluse', price_mga: 150500, category: 'CHIRURGIE' },
  { procedure_code: 'TC55', label: 'Curetage péri-apical avec/sans résection apicale', price_mga: 192500, category: 'CHIRURGIE' },
  { procedure_code: 'TC72', label: 'Trépanation sinus maxillaire voie endobuccale', price_mga: 252000, category: 'CHIRURGIE' },
  { procedure_code: 'TC28', label: 'Exérèse kyste localisé à 1 dent', price_mga: 98000, category: 'CHIRURGIE' },
  { procedure_code: 'TC62', label: 'Exérèse kyste étendu', price_mga: 217000, category: 'CHIRURGIE' },
  { procedure_code: 'TC53', label: 'Incision drainage cellulite/phlegmon', price_mga: 185500, category: 'CHIRURGIE' },
  { procedure_code: 'TC44', label: 'Kyste petit volume voie alvéolaire', price_mga: 154000, category: 'CHIRURGIE' },
  { procedure_code: 'TC68', label: 'Kyste étendu trépanation osseuse', price_mga: 238000, category: 'CHIRURGIE' },
  { procedure_code: 'TC14', label: 'Pansement ou irrigation, par séance', price_mga: 49000, category: 'CHIRURGIE' },
  { procedure_code: 'TC40S', label: 'Suture plaie endobuccale non transfixiante', price_mga: 140000, category: 'CHIRURGIE' },
  { procedure_code: 'TC48', label: 'Suture plaie labiale non transfixiante', price_mga: 168000, category: 'CHIRURGIE' },
  { procedure_code: 'TC64', label: 'Ablation kyste labial', price_mga: 224000, category: 'CHIRURGIE' },
  { procedure_code: 'TC80L', label: 'Exérèse kyste ou petite tumeur linguale', price_mga: 280000, category: 'CHIRURGIE' },
  { procedure_code: 'TC40D', label: 'Drainage endobuccal abcès dentaire', price_mga: 140000, category: 'CHIRURGIE' },
  { procedure_code: 'TC68M', label: 'Exérèse lésion muqueuse buccale', price_mga: 238000, category: 'CHIRURGIE' },
  { procedure_code: 'TC24', label: 'Ablation fragment alvéolo-dentaire fracturé', price_mga: 84000, category: 'CHIRURGIE' },
  { procedure_code: 'TC80W', label: 'Exérèse calcul du Wharton voie endobuccale', price_mga: 280000, category: 'CHIRURGIE' },
  { procedure_code: 'TC40O', label: 'Curetage ostéite maxillaire', price_mga: 140000, category: 'CHIRURGIE' },
  { procedure_code: 'TC80FL', label: 'Frénectomie linguale', price_mga: 280000, category: 'CHIRURGIE' },
  { procedure_code: 'TC68FL', label: 'Frénectomie labiale', price_mga: 238000, category: 'CHIRURGIE' },
  { procedure_code: 'TC64F', label: 'Réduction-contention fracture alvéolo-dentaire', price_mga: 224000, category: 'CHIRURGIE' },
  { procedure_code: 'TC90L', label: 'Réduction-contention luxation groupe dentaire', price_mga: 315000, category: 'CHIRURGIE' },
  { procedure_code: 'TC80R', label: 'Réimplantation dent permanente expulsée', price_mga: 280000, category: 'CHIRURGIE' },
  { procedure_code: 'TC80PP', label: 'Chirurgie pré-prothétique régularisation crête', price_mga: 280000, category: 'CHIRURGIE' },

  // PROTHESE CONJOINTE (PC x coefficient)
  { procedure_code: 'PC115', label: 'Couronne dentaire coulée entièrement métallique', price_mga: 517500, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC120', label: 'Couronne métallique coulée avec facette', price_mga: 540000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC240', label: 'Couronne métallique facette incrustée', price_mga: 1080000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC200', label: 'Couronne céramo-métallique', price_mga: 900000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC360', label: 'Couronne tout en céramique', price_mga: 1620000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC420', label: 'Couronne full zircone', price_mga: 1890000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC56', label: 'Système monobloc (Type Richmond), supplément', price_mga: 252000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC57', label: 'Faux moignon coulé simple', price_mga: 256500, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC70', label: 'Tenon calcinable', price_mga: 315000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC80', label: 'Inlay, Onlay', price_mga: 360000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC68', label: 'Overdenture coulée', price_mga: 306000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC50J', label: 'Jacket résine', price_mga: 225000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC15', label: 'Dent à tenon en résine', price_mga: 67500, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC20', label: 'Dent provisoire technique directe', price_mga: 90000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC12', label: 'Dent provisoire par iso-moulage', price_mga: 54000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC40', label: 'Descellement/Rescellement, par pilier', price_mga: 180000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC30', label: 'Réparation couronne', price_mga: 135000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC28', label: 'Recollage de facette', price_mga: 126000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC45', label: 'Réparation de céramique en bouche', price_mga: 202500, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC38', label: 'Recollage de bridge collé, par pilier', price_mga: 171000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC50BC', label: 'Bridge collé à ailettes', price_mga: 225000, category: 'PROTHESE_CONJOINTE' },
  { procedure_code: 'PC174', label: 'Prise d\'empreinte numérique', price_mga: 783000, category: 'PROTHESE_CONJOINTE' },

  // PROTHESE ADJOINTE (PA x coefficient)
  { procedure_code: 'PA45', label: 'Prothèse amovible 1 dent', price_mga: 202500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA55', label: 'Prothèse amovible 2 à 4 dents', price_mga: 247500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA80', label: 'Prothèse amovible 5 à 7 dents', price_mga: 360000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA90', label: 'Prothèse amovible 8 à 9 dents', price_mga: 405000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA95', label: 'Prothèse amovible 10 à 12 dents', price_mga: 427500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA120', label: 'Prothèse amovible 13 à 14 dents', price_mga: 540000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA165', label: 'Plaque base métallique, supplément', price_mga: 742500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA200', label: 'Plaque base flexite, supplément', price_mga: 900000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA100', label: 'Bridge Ackers', price_mga: 450000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA30', label: 'Dents coulées sur plaque métallique', price_mga: 135000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA15', label: 'Attachement par élément', price_mga: 67500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA35', label: 'Réparation plaque résine', price_mga: 157500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA40', label: 'Réparation plaque métallique', price_mga: 180000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA25', label: 'Rajout de dents ou crochets, par élément', price_mga: 112500, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA48', label: 'Rebasage', price_mga: 216000, category: 'PROTHESE_ADJOINTE' },
  { procedure_code: 'PA50', label: 'Démontage/Remontage', price_mga: 225000, category: 'PROTHESE_ADJOINTE' },

  // ORTHODONTIE (TO x coefficient)
  { procedure_code: 'TO100', label: 'Examen diagnostic avec empreinte et devis', price_mga: 500000, category: 'ORTHODONTIE' },
  { procedure_code: 'TO30', label: 'Analyse céphalométrique, supplément', price_mga: 150000, category: 'ORTHODONTIE' },
  { procedure_code: 'TO20', label: 'Rééducation oro-faciale (12 séances)', price_mga: 100000, category: 'ORTHODONTIE' },
  { procedure_code: 'TO326', label: 'Traitement orthodontique par semestre (6 max)', price_mga: 1630000, category: 'ORTHODONTIE' },
  { procedure_code: 'TO325', label: 'Traitement chirurgico-orthodontique par semestre', price_mga: 1625000, category: 'ORTHODONTIE' },
  { procedure_code: 'TO328', label: 'Contention première année', price_mga: 1640000, category: 'ORTHODONTIE' },
  { procedure_code: 'TO250', label: 'Contention deuxième année', price_mga: 1250000, category: 'ORTHODONTIE' },

  // IMPLANTOLOGIE (Ti x coefficient)
  { procedure_code: 'Ti75', label: 'Simulation dentascan ou CBCT', price_mga: 450000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti100', label: 'Diagnostic implantaire', price_mga: 600000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti50', label: 'Guide chirurgical', price_mga: 300000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti300', label: 'ROG par sextant membrane résorbable', price_mga: 1800000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti400', label: 'ROG par sextant membrane non résorbable', price_mga: 2400000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti450', label: 'Sinus lift par voie latérale', price_mga: 2700000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti400C', label: 'Sinus lift par voie crestale', price_mga: 2400000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti500', label: 'Implant', price_mga: 3000000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti550', label: 'Implant avec aménagement osseux', price_mga: 3300000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti600', label: 'Implant ptérygoïdien', price_mga: 3600000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti650', label: 'Implant zygomatique', price_mga: 3900000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti175', label: 'Pose vis de cicatrisation', price_mga: 1050000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti175R', label: 'Réparation vis cassée', price_mga: 1050000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti80', label: 'Empreinte conventionnelle implant', price_mga: 480000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti130', label: 'Empreinte scanner intra-oral', price_mga: 780000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti150', label: 'Pilier implantaire', price_mga: 900000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti200', label: 'Pilier multi-unit', price_mga: 1200000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti250', label: 'Couronne sur implant en céramique', price_mga: 1500000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti334', label: 'Couronne sur implant en zircone', price_mga: 2004000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti165M', label: 'Attachement mâle', price_mga: 990000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti165F', label: 'Attachement femelle', price_mga: 990000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti80D', label: 'Dépose implant', price_mga: 480000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti70', label: 'Dépose couronne sur implant', price_mga: 420000, category: 'IMPLANTOLOGIE' },
  { procedure_code: 'Ti50C', label: 'Contrôle implant', price_mga: 300000, category: 'IMPLANTOLOGIE' },

  // RADIOLOGIE (X x coefficient)
  { procedure_code: 'X15', label: 'Radio rétro-alvéolaire', price_mga: 52500, category: 'RADIOLOGIE' },
  { procedure_code: 'X20', label: 'Radio occlusale', price_mga: 70000, category: 'RADIOLOGIE' },
  { procedure_code: 'X35', label: 'Radiographie intrabuccale numérique', price_mga: 122500, category: 'RADIOLOGIE' },
  { procedure_code: 'X45', label: 'Panoramique', price_mga: 157500, category: 'RADIOLOGIE' },
  { procedure_code: 'X50', label: 'Téléradiographie du crâne', price_mga: 175000, category: 'RADIOLOGIE' }
];

module.exports = {
  LETTER_VALUES,
  SYNDICAL_2026_FEES
};
