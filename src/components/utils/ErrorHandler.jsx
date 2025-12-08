import { toast } from 'sonner';

// Messages d'erreur en français simple pour les médecins
const ERROR_MESSAGES = {
  // Erreurs réseau
  'Network Error': 'Problème de connexion internet. Vérifiez votre connexion.',
  'timeout': 'La demande prend trop de temps. Réessayez.',
  
  // Erreurs d'authentification
  'Unauthorized': 'Votre session a expiré. Reconnectez-vous.',
  'Forbidden': "Vous n'avez pas l'autorisation pour cette action.",
  
  // Erreurs de données
  'validation': 'Certaines informations sont manquantes ou incorrectes.',
  'duplicate': 'Cette entrée existe déjà dans le système.',
  'not_found': 'Information non trouvée dans la base de données.',
  
  // Erreurs eID
  'eid_not_detected': "Impossible de lire la carte. Vérifiez qu'elle est bien insérée.",
  'eid_no_reader': 'Aucun lecteur de carte détecté. Branchez votre lecteur.',
  'eid_timeout': 'La lecture a pris trop de temps. Retirez et réinsérez la carte.',
  
  // Erreurs MyCareNet
  'mycarenet_unavailable': 'MyCareNet est temporairement indisponible. Réessayez plus tard.',
  'mycarenet_rejected': 'La demande a été refusée par la mutuelle. Vérifiez les données patient.',
  
  // Erreurs Recip-e
  'recipe_error': "Erreur lors de l'envoi de la prescription électronique.",
  
  // Erreurs générales
  'default': 'Une erreur inattendue est survenue. Contactez le support si cela persiste.'
};

export function handleError(error, context = '') {
  console.error('Error:', error);
  
  let message = ERROR_MESSAGES.default;
  
  // Identifier le type d'erreur
  if (error.message) {
    const errorMsg = error.message.toLowerCase();
    
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
      if (errorMsg.includes(key.toLowerCase())) {
        message = value;
        break;
      }
    }
  }
  
  // Ajouter le contexte si fourni
  if (context) {
    message = `${context}: ${message}`;
  }
  
  toast.error(message, {
    duration: 5000,
    action: {
      label: 'OK',
      onClick: () => {}
    }
  });
  
  return message;
}

export function handleSuccess(message, action = null) {
  toast.success(message, {
    duration: 3000,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined
  });
}

export function handleWarning(message) {
  toast.warning(message, {
    duration: 4000
  });
}

export function handleInfo(message) {
  toast.info(message, {
    duration: 3000
  });
}