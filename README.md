# VALB-THERM — refonte

Site statique responsive pour VALB-THERM Sàrl, avec espace admin **de démonstration**. Ouvrir `index.html` pour la vitrine et `admin.html` pour la démo. Déploiement possible sur Vercel avec le preset **Other** (répertoire racine, aucune commande de build).

## Formulaire

Le formulaire ouvre un e-mail prérempli par défaut. Pour activer Web3Forms, créer `config.js` à la racine contenant `window.VALB_WEB3FORMS_KEY = 'VOTRE_CLE';`, puis insérer `<script src="config.js"></script>` avant `script.js` dans `index.html`. Ne publier le formulaire qu’après avoir testé la réception. La clé publique Web3Forms n’est pas un secret serveur, mais valider les paramètres anti-spam et le domaine dans Web3Forms.

## Admin

`admin.html` présente des exemples fictifs et permet de les modifier dans le stockage local du navigateur. Il n’y a **aucune authentification, base de données, synchronisation, réception des devis ou réservation réelle**. Avant tout usage professionnel, prévoir un backend, un contrôle d’accès, une politique de conservation et un calendrier. Ne pas utiliser la démo pour des données clients réelles.

## Contenu

Les coordonnées et prestations ont été reprises de valbtherm.ch. Les photos proviennent d’Unsplash à titre d’illustration et ne représentent pas des réalisations de l’entreprise. Remplacer par des photos et logos autorisés avant validation finale. Le texte de protection des données est un point de départ à revoir selon la configuration réelle.
