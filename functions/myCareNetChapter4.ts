import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MyCareNet Chapter IV - Demandes d'autorisation préalable
// Documentation: https://www.mycarenet.be

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'check_eligibility': {
        // Vérifier si un médicament nécessite Chapitre IV
        const { cnk, patient_niss } = body;
        
        // Simulation - En production: appel API MyCareNet
        const chapterIVRequired = await checkChapterIVRequired(cnk);
        
        return Response.json({
          cnk,
          chapter_iv_required: chapterIVRequired.required,
          paragraph: chapterIVRequired.paragraph,
          conditions: chapterIVRequired.conditions,
          validity_period: chapterIVRequired.validity_period,
          renewable: chapterIVRequired.renewable,
          prescriber_restrictions: chapterIVRequired.prescriber_restrictions
        });
      }

      case 'check_existing_agreement': {
        // Vérifier si le patient a déjà un accord
        const { patient_niss, paragraph } = body;
        
        // En production: appel MyCareNet ConsultAgreement
        return Response.json({
          has_agreement: false,
          agreements: [],
          message: 'Aucun accord existant trouvé'
        });
      }

      case 'submit_request': {
        // Soumettre une demande Chapitre IV
        const { 
          patient_id,
          patient_niss,
          medication,
          paragraph,
          diagnosis,
          justification,
          prescriber_nihii,
          duration_months,
          attachments
        } = body;

        // Validation
        if (!patient_niss || !medication?.cnk || !paragraph || !diagnosis) {
          return Response.json({ 
            error: 'Données manquantes pour la demande' 
          }, { status: 400 });
        }

        // Créer la demande dans notre système
        const request = await base44.entities.ChapterIVRequest.create({
          patient_id,
          patient_niss,
          medication_cnk: medication.cnk,
          medication_name: medication.product_name,
          paragraph,
          diagnosis_code: diagnosis.code,
          diagnosis_description: diagnosis.description,
          justification,
          prescriber_nihii: prescriber_nihii || user.numero_inami,
          prescriber_email: user.email,
          duration_requested: duration_months || 12,
          status: 'PENDING',
          submitted_at: new Date().toISOString(),
          attachments: attachments || []
        });

        // En production: envoi via MyCareNet AskAgreement
        // Pour l'instant, simulation
        const myCareNetResponse = await simulateMyCareNetSubmission(request);

        // Mettre à jour avec la réponse
        await base44.entities.ChapterIVRequest.update(request.id, {
          mycarenet_reference: myCareNetResponse.reference,
          status: myCareNetResponse.status,
          response_date: myCareNetResponse.response_date,
          response_message: myCareNetResponse.message
        });

        return Response.json({
          success: true,
          request_id: request.id,
          mycarenet_reference: myCareNetResponse.reference,
          status: myCareNetResponse.status,
          estimated_response: myCareNetResponse.estimated_response,
          message: myCareNetResponse.message
        });
      }

      case 'get_status': {
        // Obtenir le statut d'une demande
        const { request_id } = body;
        
        const requests = await base44.entities.ChapterIVRequest.filter({ id: request_id });
        if (requests.length === 0) {
          return Response.json({ error: 'Demande non trouvée' }, { status: 404 });
        }

        return Response.json({
          request: requests[0]
        });
      }

      case 'list_requests': {
        // Lister les demandes d'un patient
        const { patient_id, status_filter } = body;
        
        let filter = { patient_id };
        if (status_filter && status_filter !== 'all') {
          filter.status = status_filter;
        }

        const requests = await base44.entities.ChapterIVRequest.filter(filter, '-submitted_at', 50);

        return Response.json({
          requests,
          total: requests.length
        });
      }

      case 'cancel_request': {
        // Annuler une demande en attente
        const { request_id, reason } = body;
        
        await base44.entities.ChapterIVRequest.update(request_id, {
          status: 'CANCELLED',
          cancellation_reason: reason,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.email
        });

        return Response.json({ success: true });
      }

      default:
        return Response.json({ error: 'Action non reconnue' }, { status: 400 });
    }
  } catch (error) {
    console.error('MyCareNet Chapter IV Error:', error);
    
    // Classification de l'erreur pour le frontend
    const errorMessage = error.message || 'Erreur inconnue';
    const isExternalError = 
      errorMessage.includes('timeout') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('network') ||
      errorMessage.includes('SOAP') ||
      errorMessage.includes('MyCareNet');
    
    const errorResponse = {
      error: errorMessage,
      error_type: isExternalError ? 'EXTERNAL' : 'INTERNAL',
      error_source: isExternalError ? 'MyCareNet' : 'Application',
      timestamp: new Date().toISOString(),
      suggestion: isExternalError 
        ? 'Le service MyCareNet est temporairement indisponible. Veuillez réessayer dans quelques minutes.'
        : 'Une erreur interne s\'est produite. Veuillez contacter le support technique.'
    };
    
    return Response.json(errorResponse, { status: isExternalError ? 503 : 500 });
  }
});

// Vérifier si un médicament nécessite Chapitre IV
async function checkChapterIVRequired(cnk) {
  // En production: appel API SAM ou base locale
  // Simulation basée sur patterns courants
  const chapterIVMedications = {
    // Biologiques / Immunosuppresseurs
    'humira': { required: true, paragraph: '5.8.1', conditions: ['Polyarthrite rhumatoïde', 'Psoriasis', 'Crohn'], validity_period: 12, renewable: true },
    'enbrel': { required: true, paragraph: '5.8.1', conditions: ['Polyarthrite rhumatoïde', 'Psoriasis'], validity_period: 12, renewable: true },
    'remicade': { required: true, paragraph: '5.8.1', conditions: ['Crohn', 'Colite ulcéreuse'], validity_period: 12, renewable: true },
    // Anticoagulants oraux directs
    'eliquis': { required: true, paragraph: '4.2.2', conditions: ['FA non valvulaire', 'TVP/EP'], validity_period: 12, renewable: true },
    'xarelto': { required: true, paragraph: '4.2.2', conditions: ['FA non valvulaire', 'TVP/EP'], validity_period: 12, renewable: true },
    'pradaxa': { required: true, paragraph: '4.2.2', conditions: ['FA non valvulaire'], validity_period: 12, renewable: true },
    // Oncologie
    'keytruda': { required: true, paragraph: '8.1', conditions: ['Mélanome', 'CBNPC', 'Carcinome urothélial'], validity_period: 6, renewable: true, prescriber_restrictions: ['oncologue'] },
    'opdivo': { required: true, paragraph: '8.1', conditions: ['Mélanome', 'CBNPC'], validity_period: 6, renewable: true, prescriber_restrictions: ['oncologue'] },
    // Diabète (GLP-1)
    'ozempic': { required: true, paragraph: '3.2.1', conditions: ['DT2 avec IMC ≥ 30', 'DT2 avec MCV'], validity_period: 12, renewable: true },
    'trulicity': { required: true, paragraph: '3.2.1', conditions: ['DT2 avec IMC ≥ 30'], validity_period: 12, renewable: true },
  };

  // Vérifier par nom (simplifié)
  const cnkLower = (cnk || '').toLowerCase();
  for (const [medName, info] of Object.entries(chapterIVMedications)) {
    if (cnkLower.includes(medName)) {
      return info;
    }
  }

  return { required: false };
}

// Simulation envoi MyCareNet
async function simulateMyCareNetSubmission(request) {
  // En production: appel SOAP MyCareNet AskAgreement
  const reference = `MCN-CH4-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  return {
    reference,
    status: 'SUBMITTED',
    response_date: null,
    estimated_response: '5-10 jours ouvrables',
    message: 'Demande transmise au médecin-conseil. Vous recevrez une notification lors de la décision.'
  };
}