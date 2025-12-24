import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// SAM v2 API - Source Authentique des Médicaments Belgique
// Documentation: https://www.samportal.be
// API publique en open data

const SAM_API_BASE = 'https://sam.service.smals.be/wsrest/sam/v2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { action, query, cnk, lang = 'fr' } = await req.json();

    switch (action) {
      case 'search': {
        // Recherche de médicaments par nom
        const searchUrl = `${SAM_API_BASE}/amp/search?q=${encodeURIComponent(query)}&lang=${lang}&limit=50`;
        
        const response = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': lang
          }
        });

        if (!response.ok) {
          // Fallback sur données locales si API indisponible
          return Response.json({ 
            source: 'local',
            message: 'API SAM indisponible, recherche locale',
            results: [] 
          });
        }

        const data = await response.json();
        
        // Transformer les données SAM en format utilisable
        const results = (data.results || []).map(amp => ({
          sam_id: amp.ampCode,
          cnk: amp.cnk,
          product_name: amp.officialName || amp.abbreviatedName,
          substance_name: amp.vmpGroup?.name,
          atc_code: amp.atcCodes?.[0],
          form: amp.pharmaceuticalForm?.name,
          strength: amp.activeIngredients?.[0]?.strength,
          unit: amp.activeIngredients?.[0]?.unit,
          route: amp.administrationRoutes?.[0]?.name,
          package_size: amp.packagingSize,
          manufacturer: amp.company?.name,
          // Données INAMI
          reimbursement: amp.reimbursement ? {
            category: amp.reimbursement.category,
            basis: amp.reimbursement.reimbursementBasis,
            public_price: amp.reimbursement.publicPrice,
            patient_share: amp.reimbursement.patientShare,
            supplement: amp.reimbursement.supplement
          } : null,
          // Disponibilité
          availability: {
            status: amp.availabilityStatus || 'available',
            unavailable_since: amp.unavailableSince,
            expected_available: amp.expectedAvailableDate
          },
          // Chapitre IV
          chapter_iv: amp.chapterIV ? {
            required: true,
            paragraph: amp.chapterIV.paragraph,
            conditions: amp.chapterIV.conditions
          } : null
        }));

        return Response.json({ 
          source: 'sam_v2',
          total: data.total || results.length,
          results 
        });
      }

      case 'details': {
        // Détails complets d'un médicament par CNK
        const detailsUrl = `${SAM_API_BASE}/amp/${cnk}?lang=${lang}`;
        
        const response = await fetch(detailsUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': lang
          }
        });

        if (!response.ok) {
          return Response.json({ error: 'Médicament non trouvé' }, { status: 404 });
        }

        const amp = await response.json();
        
        return Response.json({
          source: 'sam_v2',
          medication: {
            sam_id: amp.ampCode,
            cnk: amp.cnk,
            product_name: amp.officialName,
            abbreviated_name: amp.abbreviatedName,
            substance_name: amp.vmpGroup?.name,
            atc_code: amp.atcCodes?.[0],
            atc_description: amp.atcDescription,
            form: amp.pharmaceuticalForm?.name,
            route: amp.administrationRoutes?.[0]?.name,
            strength: amp.activeIngredients?.[0]?.strength,
            active_ingredients: amp.activeIngredients?.map(ai => ({
              name: ai.name,
              strength: ai.strength,
              unit: ai.unit
            })),
            manufacturer: amp.company?.name,
            marketing_authorization: amp.marketingAuthorization,
            // Prix et remboursement
            pricing: {
              public_price: amp.publicPrice,
              ex_factory_price: amp.exFactoryPrice,
              reimbursement_basis: amp.reimbursement?.reimbursementBasis,
              patient_share_normal: amp.reimbursement?.patientShare,
              patient_share_bim: amp.reimbursement?.patientShareBIM,
              category: amp.reimbursement?.category
            },
            // Disponibilité
            availability: {
              status: amp.availabilityStatus,
              unavailable_since: amp.unavailableSince,
              reason: amp.unavailabilityReason,
              expected_date: amp.expectedAvailableDate
            },
            // Alternatives (génériques)
            alternatives: amp.alternatives?.map(alt => ({
              cnk: alt.cnk,
              name: alt.name,
              is_generic: alt.isGeneric,
              is_biosimilar: alt.isBiosimilar,
              public_price: alt.publicPrice,
              patient_share: alt.patientShare
            })),
            // Interactions
            interactions: amp.interactions?.map(int => ({
              drug_name: int.interactingDrug,
              severity: int.severity,
              description: int.description,
              recommendation: int.recommendation
            })),
            // Contre-indications
            contraindications: amp.contraindications,
            // Posologie standard
            standard_dosage: amp.dosageInstructions,
            // Documents (RCP, notice)
            documents: {
              spc_url: amp.spcUrl,
              pil_url: amp.pilUrl
            }
          }
        });
      }

      case 'alternatives': {
        // Recherche d'alternatives (génériques/biosimilaires)
        const altUrl = `${SAM_API_BASE}/amp/${cnk}/alternatives?lang=${lang}`;
        
        const response = await fetch(altUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': lang
          }
        });

        if (!response.ok) {
          return Response.json({ alternatives: [] });
        }

        const data = await response.json();
        
        return Response.json({
          source: 'sam_v2',
          original_cnk: cnk,
          alternatives: (data.alternatives || []).map(alt => ({
            cnk: alt.cnk,
            product_name: alt.name,
            manufacturer: alt.company,
            is_generic: alt.isGeneric,
            is_biosimilar: alt.isBiosimilar,
            is_cheapest: alt.isCheapest,
            public_price: alt.publicPrice,
            patient_share: alt.patientShare,
            savings: alt.savingsVsOriginal
          }))
        });
      }

      case 'interactions': {
        // Vérification interactions entre plusieurs médicaments
        const { cnk_list } = await req.json();
        
        if (!cnk_list || cnk_list.length < 2) {
          return Response.json({ interactions: [] });
        }

        const intUrl = `${SAM_API_BASE}/interactions/check`;
        
        const response = await fetch(intUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': lang
          },
          body: JSON.stringify({ cnkCodes: cnk_list })
        });

        if (!response.ok) {
          return Response.json({ interactions: [] });
        }

        const data = await response.json();
        
        return Response.json({
          source: 'sam_v2',
          interactions: (data.interactions || []).map(int => ({
            drug_a: int.drugA,
            drug_b: int.drugB,
            severity: int.severity, // MINOR, MODERATE, MAJOR, CONTRAINDICATED
            type: int.interactionType,
            description: int.description,
            mechanism: int.mechanism,
            recommendation: int.clinicalRecommendation
          }))
        });
      }

      case 'reimbursement': {
        // Infos remboursement détaillées
        const reimbUrl = `${SAM_API_BASE}/amp/${cnk}/reimbursement?lang=${lang}`;
        
        const response = await fetch(reimbUrl, {
          headers: {
            'Accept': 'application/json',
            'Accept-Language': lang
          }
        });

        if (!response.ok) {
          return Response.json({ reimbursement: null });
        }

        const data = await response.json();
        
        return Response.json({
          source: 'sam_v2',
          cnk,
          reimbursement: {
            category: data.category, // A, B, C, Cs, Cx
            category_description: getCategoryDescription(data.category),
            public_price: data.publicPrice,
            reimbursement_basis: data.reimbursementBasis,
            patient_share_normal: data.patientShareNormal,
            patient_share_bim: data.patientShareBIM, // Intervention majorée
            patient_share_omnio: data.patientShareOMNIO,
            third_party_payer: data.thirdPartyPayer,
            chapter_iv: data.chapterIV ? {
              required: true,
              paragraph: data.chapterIV.paragraph,
              conditions: data.chapterIV.conditions,
              validity_period: data.chapterIV.validityPeriod,
              renewable: data.chapterIV.renewable
            } : null,
            prescriber_restrictions: data.prescriberRestrictions
          }
        });
      }

      default:
        return Response.json({ error: 'Action non reconnue' }, { status: 400 });
    }
  } catch (error) {
    console.error('SAM v2 Error:', error);
    return Response.json({ 
      error: error.message,
      source: 'error'
    }, { status: 500 });
  }
});

function getCategoryDescription(category) {
  const descriptions = {
    'A': 'Remboursement 100% - Médicaments vitaux',
    'B': 'Remboursement 75% - Médicaments importants',
    'C': 'Remboursement 50% - Médicaments utiles',
    'Cs': 'Remboursement 40% - Médicaments de confort',
    'Cx': 'Remboursement 20% - Autres médicaments'
  };
  return descriptions[category] || 'Non remboursé';
}