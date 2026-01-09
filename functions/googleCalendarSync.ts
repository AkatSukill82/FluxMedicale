import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");

    switch (action) {
      case 'list_calendars': {
        const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const calendars = await response.json();
        return Response.json({ calendars: calendars.items || [] });
      }

      case 'list_events': {
        const { calendarId = 'primary', timeMin, timeMax } = data || {};
        const params = new URLSearchParams({
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          singleEvents: 'true',
          orderBy: 'startTime'
        });
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const events = await response.json();
        return Response.json({ events: events.items || [] });
      }

      case 'create_event': {
        const { calendarId = 'primary', event } = data;
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
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
        return Response.json({ event: createdEvent });
      }

      case 'update_event': {
        const { calendarId = 'primary', eventId, event } = data;
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
          }
        );
        const updatedEvent = await response.json();
        return Response.json({ event: updatedEvent });
      }

      case 'delete_event': {
        const { calendarId = 'primary', eventId } = data;
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        return Response.json({ success: true });
      }

      case 'sync_appointment': {
        const { appointment, patient } = data;
        const patientName = patient?.name?.[0] 
          ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
          : 'Patient';

        const startDateTime = new Date(`${appointment.date}T${appointment.heure_debut}`);
        const endDateTime = appointment.heure_fin 
          ? new Date(`${appointment.date}T${appointment.heure_fin}`)
          : new Date(startDateTime.getTime() + (appointment.duree_estimee || 30) * 60000);

        const event = {
          summary: `RDV: ${patientName} - ${appointment.type_consultation}`,
          description: `Motif: ${appointment.motif || 'Non spécifié'}\nType: ${appointment.type_consultation}\nStatut: ${appointment.statut}`,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Europe/Brussels'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Europe/Brussels'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 30 },
              { method: 'email', minutes: 1440 }
            ]
          }
        };

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
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
        
        // Mettre à jour le RDV avec l'ID Google
        if (createdEvent.id) {
          await base44.entities.RendezVous.update(appointment.id, {
            google_calendar_event_id: createdEvent.id
          });
        }

        return Response.json({ event: createdEvent, success: true });
      }

      case 'get_free_busy': {
        const { timeMin, timeMax, calendarId = 'primary' } = data;
        const response = await fetch(
          'https://www.googleapis.com/calendar/v3/freeBusy',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              timeMin: timeMin || new Date().toISOString(),
              timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              items: [{ id: calendarId }]
            })
          }
        );
        const freeBusy = await response.json();
        return Response.json({ freeBusy });
      }

      default:
        return Response.json({ error: 'Action non reconnue' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erreur Google Calendar:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});