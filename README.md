# VALB-THERM — refonte

Site statique responsive pour VALB-THERM Sàrl, avec espace admin **de démonstration**. Ouvrir `index.html` pour la vitrine et `admin.html` pour la démo. Déploiement possible sur Vercel avec le preset **Other** (répertoire racine, aucune commande de build).

## Formulaire

Le formulaire ouvre un e-mail prérempli par défaut. Pour activer Web3Forms, créer `config.js` à la racine contenant `window.VALB_WEB3FORMS_KEY = 'VOTRE_CLE';`, puis insérer `<script src="config.js"></script>` avant `script.js` dans `index.html`. Ne publier le formulaire qu’après avoir testé la réception. La clé publique Web3Forms n’est pas un secret serveur, mais valider les paramètres anti-spam et le domaine dans Web3Forms.

## Admin

`admin.html` présente des exemples fictifs et permet de les modifier dans le stockage local du navigateur. Il n’y a **aucune authentification, base de données, synchronisation, réception des devis ou réservation réelle**. Avant tout usage professionnel, prévoir un backend, un contrôle d’accès, une politique de conservation et un calendrier. Ne pas utiliser la démo pour des données clients réelles.

## Contenu

Les coordonnées, prestations, le logo, la galerie de réalisations et les logos partenaires viennent du site public valbtherm.ch. Les images sont référencées par leurs URL d’origine ; conserver ces fichiers disponibles sur l’ancien site ou les héberger dans ce dépôt avant de retirer WordPress. Vérifier que l’entreprise dispose des droits sur ces photos et logos. Le texte de protection des données est un point de départ à revoir selon la configuration réelle.
