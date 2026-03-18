import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // CORS headers pour accès public
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const { action, data } = await req.json();

    switch (action) {
      case 'get_available_slots': {
        // Récupérer les créneaux disponibles pour une période donnée
        const { date, medecin_email } = data;
        
        // Récupérer les RDV existants pour cette date
        const existingRdv = await base44.asServiceRole.entities.RendezVous.filter({
          date: date,
          statut: { $nin: ['Annulé'] }
        });

        // Récupérer les créneaux configurés
        let slots = [];
        try {
          slots = await base44.asServiceRole.entities.CalendarSlot.filter({
            is_active: true
          });
        } catch (e) {
          // Si pas de créneaux configurés, utiliser des créneaux par défaut
        }

        // Générer les créneaux disponibles (8h-18h par défaut)
        const availableSlots = [];
        const occupiedTimes = existingRdv.map(rdv => rdv.heure_debut);
        
        for (let hour = 8; hour < 18; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            if (!occupiedTimes.includes(timeStr)) {
              availableSlots.push({
                time: timeStr,
                available: true
              });
            }
          }
        }

        return Response.json({ slots: availableSlots }, { headers: corsHeaders });
      }

      case 'get_doctors': {
        // Récupérer la liste des médecins disponibles
        const users = await base44.asServiceRole.entities.User.filter({
          role: 'admin'
        });
        
        const doctors = users.map(u => ({
          email: u.email,
          name: u.full_name
        }));

        return Response.json({ doctors }, { headers: corsHeaders });
      }

      case 'book_appointment': {
        // Créer un RDV depuis la page publique
        const { 
          date, 
          heure_debut, 
          type_consultation,
          motif,
          medecin_assigne,
          patient_nom,
          patient_prenom,
          patient_telephone,
          patient_email
        } = data;

        // Vérifier que le créneau est toujours disponible
        const existingRdv = await base44.asServiceRole.entities.RendezVous.filter({
          date: date,
          heure_debut: heure_debut,
          statut: { $nin: ['Annulé'] }
        });

        if (existingRdv.length > 0) {
          return Response.json(
            { error: 'Ce créneau n\'est plus disponible' }, 
            { status: 400, headers: corsHeaders }
          );
        }

        // Calculer l'heure de fin
        const [h, m] = heure_debut.split(':').map(Number);
        const endMinutes = h * 60 + m + 30;
        const heure_fin = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

        // Créer le RDV
        const newRdv = await base44.asServiceRole.entities.RendezVous.create({
          date,
          heure_debut,
          heure_fin,
          type_consultation: type_consultation || 'Consultation',
          motif: motif || '',
          medecin_assigne,
          statut: 'Planifié',
          source: 'en_ligne',
          patient_nom,
          patient_prenom,
          patient_telephone,
          patient_email,
          duree_estimee: 30
        });

        // Synchroniser avec Google Calendar si configuré
        try {
          const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
          if (accessToken) {
            const startDateTime = new Date(`${date}T${heure_debut}:00`);
            const endDateTime = new Date(`${date}T${heure_fin}:00`);

            const event = {
              summary: `RDV en ligne: ${patient_prenom} ${patient_nom}`,
              description: `Type: ${type_consultation}\nMotif: ${motif || 'Non spécifié'}\nTél: ${patient_telephone}\nEmail: ${patient_email}`,
              start: {
                dateTime: startDateTime.toISOString(),
                timeZone: 'Europe/Brussels'
              },
              end: {
                dateTime: endDateTime.toISOString(),
                timeZone: 'Europe/Brussels'
              }
            };

            const response = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
              }
            );
            
            const createdEvent = await response.json();
            if (createdEvent.id) {
              await base44.asServiceRole.entities.RendezVous.update(newRdv.id, {
                google_calendar_event_id: createdEvent.id
              });
            }
          }
        } catch (e) {
          console.log('Google Calendar sync skipped:', e.message);
        }

        return Response.json({ 
          success: true, 
          appointment: newRdv,
          message: 'Votre rendez-vous a été confirmé'
        }, { headers: corsHeaders });
      }

      default:
        return Response.json(
          { error: 'Action non reconnue' }, 
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error) {
    console.error('Erreur booking:', error);
    return Response.json(
      { error: error.message }, 
      { status: 500, headers: { ...corsHeaders } }
    );
  }
});