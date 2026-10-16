# VALB-THERM — refonte

Site responsive pour VALB-THERM Sàrl, avec une identité rouge chauffage / bleu sanitaire, le slogan « L’art de chauffer », une page `projets.html` et un espace d’administration relié à Firebase. Ouvrir `index.html` pour la vitrine et `admin.html` pour l’administration. Déploiement possible sur Vercel avec le preset **Other** (répertoire racine, aucune commande de build).

## Formulaire

Le formulaire public enregistre les demandes dans la collection Firestore `requests`. Si Firebase est momentanément indisponible, il ouvre un e-mail prérempli afin que la demande ne soit pas perdue.

## Admin Firebase

`admin.html` utilise Firebase Authentication, Cloud Firestore et Cloud Storage. Un utilisateur connecté n’accède au tableau de bord que si le document `admins/{uid}` existe avec le champ booléen `active: true`. L’admin gère les demandes, les statuts, les rendez-vous et les cartes illustrées affichées sur le site.

Avant la mise en production, activer Email/Password dans Firebase Authentication, créer la base Firestore, créer le premier document administrateur, activer Storage, ajouter les domaines autorisés puis publier `firestore.rules` et `storage.rules`. La configuration du projet est dans `firebase-config.js`; les clés du SDK Web identifient le projet mais la sécurité réelle est assurée par Authentication et les règles.

## Contenu

Les coordonnées, prestations, le logo, la galerie de réalisations et les logos partenaires viennent du site public valbtherm.ch. Une copie des images est incluse dans `assets/` pour que ce site reste autonome après un retrait de WordPress. Vérifier que l’entreprise dispose des droits sur ces photos et logos. Le texte de protection des données est un point de départ à revoir selon la configuration réelle.

## Présentation et mouvement

Les photos existantes sont conservées. Les étapes chauffage sont une présentation générale du déroulement d’une installation, pas un récit attribué à un chantier précis. Les animations (entrée du titre, lumières, parallaxe et apparition au défilement) respectent `prefers-reduced-motion`. Aucun montant, calendrier de négociation ou note privée n’est intégré à la vitrine.

## Icônes et surfaces

`assets/icons.svg` contient les pictogrammes vectoriels personnalisés, sans emoji. `assets/favicon.svg` reprend la flamme rouge et la goutte bleue. `glass.css` harmonise les rayons et les surfaces translucides, avec une alternative opaque si le flou n’est pas pris en charge ou si la réduction de transparence est demandée.

## Animations

Apparitions en cascade au défilement, reflets et légère inclinaison des cartes à la souris, onde au clic, transitions du menu et de la galerie. Les effets de souris sont désactivés sur les écrans tactiles ; les animations respectent la réduction de mouvement, y compris si le réglage change pendant la visite. Aucun outil supplémentaire n’est requis.

## Mise à jour du 14 octobre 2026

Logo horizontal officiel dans la navigation, symbole en traits en arrière-plan, police Google Open Sans (SemiBold pour les titres de cartes). Climatisation retirée ; ventilation conservée avec des cartes plus grandes. Section pompes à chaleur / énergies renouvelables, avec la photo fournie en illustration.

La page `projets.html` organise les onze photos existantes en trois galeries : sanitaire, chauffage et lavabos / salles de bains. Les liens de la page d’accueil pointent directement vers chaque domaine et la visionneuse reste dans le domaine choisi.

Les quatre témoignages fournis sont affichés comme extraits statiques, sans note globale ni date relative inventée. Ils sont présents sur l’accueil et sur `avis.html`, avec liens vers les profils Google et la fiche de l’entreprise. Ils ne sont pas synchronisés automatiquement avec Google. Google Maps est intégré à l’adresse de l’entreprise sur ces deux pages.

La mention entreprise formatrice est séparée des partenaires et placée en bas de page. Les cinq images reçues sont incluses dans `assets/`. `updates.css` porte les ajustements de cette mise à jour.

## Avis animés

La section des avis sur l’accueil et `avis.html` utilise un carrousel natif scroll-snap, avec défilement toutes les sept secondes, choix direct par auteur, commandes précédent / suivant, pause et navigation au clavier. La lecture automatique s’arrête hors écran, en arrière-plan, au survol et lors de l’interaction. Le réglage de réduction de mouvement désactive le défilement automatique et les animations décoratives ; sans JavaScript, les quatre avis restent lisibles en grille.
