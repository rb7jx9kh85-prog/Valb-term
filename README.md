# VALB-THERM — refonte

Site statique responsive pour VALB-THERM Sàrl, avec une identité rouge chauffage / bleu climatisation, le slogan « L’art de chauffer », une page `projets.html` et un espace admin **de démonstration**. Ouvrir `index.html` pour la vitrine et `admin.html` pour la démo. Déploiement possible sur Vercel avec le preset **Other** (répertoire racine, aucune commande de build).

## Formulaire

Le formulaire ouvre un e-mail prérempli par défaut. Pour activer Web3Forms, créer `config.js` à la racine contenant `window.VALB_WEB3FORMS_KEY = 'VOTRE_CLE';`, puis insérer `<script src="config.js"></script>` avant `script.js` dans `index.html`. Ne publier le formulaire qu’après avoir testé la réception. La clé publique Web3Forms n’est pas un secret serveur, mais valider les paramètres anti-spam et le domaine dans Web3Forms.

## Admin

`admin.html` présente des exemples fictifs et permet de les modifier dans le stockage local du navigateur. Il n’y a **aucune authentification, base de données, synchronisation, réception des devis ou réservation réelle**. Avant tout usage professionnel, prévoir un backend, un contrôle d’accès, une politique de conservation et un calendrier. Ne pas utiliser la démo pour des données clients réelles.

## Contenu

Les coordonnées, prestations, le logo, la galerie de réalisations et les logos partenaires viennent du site public valbtherm.ch. Une copie des images est incluse dans `assets/` pour que ce site reste autonome après un retrait de WordPress. Vérifier que l’entreprise dispose des droits sur ces photos et logos. Le texte de protection des données est un point de départ à revoir selon la configuration réelle.

## Présentation et mouvement

Les photos existantes sont conservées. Les étapes chauffage sont une présentation générale du déroulement d’une installation, pas un récit attribué à un chantier précis. Les animations (entrée du titre, lumières, parallaxe et apparition au défilement) respectent `prefers-reduced-motion`. Aucun montant, calendrier de négociation ou note privée n’est intégré à la vitrine.

## Icônes et surfaces

`assets/icons.svg` contient les pictogrammes vectoriels personnalisés, sans emoji. `assets/favicon.svg` reprend la flamme rouge et la goutte bleue. `glass.css` harmonise les rayons et les surfaces translucides, avec une alternative opaque si le flou n’est pas pris en charge ou si la réduction de transparence est demandée.

## Animations

Apparitions en cascade au défilement, reflets et légère inclinaison des cartes à la souris, onde au clic, transitions du menu et de la galerie. Les effets de souris sont désactivés sur les écrans tactiles ; les animations respectent la réduction de mouvement, y compris si le réglage change pendant la visite. Aucun outil supplémentaire n’est requis.
