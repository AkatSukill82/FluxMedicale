import { useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook OpenTelemetry pour instrumentation des parcours critiques
export const useOpenTelemetry = (currentUser) => {
  
  // Créer un span (trace)
  const createSpan = useCallback((name, attributes = {}) => {
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const traceId = attributes.trace_id || `trace_${Date.now()}`;
    
    const span = {
      span_id: spanId,
      trace_id: traceId,
      name: name,
      start_time: Date.now(),
      attributes: {
        ...attributes,
        'user.email': currentUser?.email,
        'service.name': 'medibridge-frontend',
        'deployment.environment': 'acceptance'
      },
      events: [],
      status: 'OK'
    };

    console.log('[OTel] Span started:', span.name, span.span_id);
    return span;
  }, [currentUser]);

  // Terminer un span
  const endSpan = useCallback((span, status = 'OK', error = null) => {
    span.end_time = Date.now();
    span.duration_ms = span.end_time - span.start_time;
    span.status = status;
    
    if (error) {
      span.attributes['error.type'] = error.name;
      span.attributes['error.message'] = error.message;
      span.attributes['error.stack'] = error.stack;
    }

    console.log('[OTel] Span ended:', span.name, `${span.duration_ms}ms`, span.status);
    
    // Export vers collector (simulation)
    exportSpan(span);
    
    return span;
  }, []);

  // Ajouter un événement au span
  const addSpanEvent = useCallback((span, eventName, attributes = {}) => {
    span.events.push({
      timestamp: Date.now(),
      name: eventName,
      attributes: attributes
    });
    
    console.log('[OTel] Event added:', eventName);
  }, []);

  // Exporter span vers collector
  const exportSpan = useCallback(async (span) => {
    // En production: POST vers collector OTel (ex: http://localhost:4318/v1/traces)
    // Sampling: tail-based (si erreur ou > p95), sinon head-based 1%
    
    const shouldSample = span.status === 'ERROR' || 
                        span.duration_ms > 5000 || 
                        Math.random() < 0.01; // 1% sampling

    if (!shouldSample) {
      console.log('[OTel] Span dropped (sampling)');
      return;
    }

    console.log('[OTel] Exporting span to collector:', {
      trace_id: span.trace_id,
      span_id: span.span_id,
      name: span.name,
      duration_ms: span.duration_ms,
      status: span.status
    });

    // Audit log pour corréler
    if (currentUser) {
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'OTEL_SPAN',
        target_entity: 'Trace',
        target_id: span.trace_id,
        details: `${span.name} - ${span.duration_ms}ms - ${span.status}`,
        timestamp: new Date().toISOString()
      });
    }
  }, [currentUser]);

  // Tracer un parcours Recip-e complet
  const traceRecipeFlow = useCallback(async (patient, prescription, operation) => {
    const traceId = `trace_recip_${Date.now()}`;
    
    const rootSpan = createSpan('consultation.prescribe', {
      trace_id: traceId,
      'patient.id.hash': hashPatientId(patient.id),
      'prescription.id': prescription?.id,
      'operation': operation
    });

    addSpanEvent(rootSpan, 'prescription.validated', {
      'medications.count': prescription?.medicaments?.length || 0
    });

    // Span Recip-e
    const recipeSpan = createSpan('recip-e.create', {
      trace_id: traceId,
      parent_span_id: rootSpan.span_id,
      'recip-e.rid': prescription?.recip_e_rid || 'pending'
    });

    try {
      // Simulation appel Recip-e
      await new Promise(resolve => setTimeout(resolve, 800));
      
      addSpanEvent(recipeSpan, 'recip-e.sent', {
        'recip-e.status': 'SENT',
        'recip-e.rid': `RID_${Date.now()}`
      });
      
      endSpan(recipeSpan, 'OK');
    } catch (error) {
      endSpan(recipeSpan, 'ERROR', error);
    }

    endSpan(rootSpan, 'OK');
    
    return { trace_id: traceId, root_span_id: rootSpan.span_id };
  }, [createSpan, endSpan, addSpanEvent]);

  // Tracer un parcours MyCareNet (eFact/eAttest)
  const traceMyCareNetFlow = useCallback(async (patient, invoice, transactionType) => {
    const traceId = `trace_mycarenet_${Date.now()}`;
    
    const rootSpan = createSpan('consultation.invoice', {
      trace_id: traceId,
      'patient.id.hash': hashPatientId(patient.id),
      'invoice.id': invoice?.id,
      'transaction.type': transactionType
    });

    // Span assurabilité
    const assurSpan = createSpan('mycarenet.assurabilite', {
      trace_id: traceId,
      parent_span_id: rootSpan.span_id,
      'patient.niss': 'MASKED',
      'oa.code': invoice?.oa_code
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      addSpanEvent(assurSpan, 'assurabilite.checked', {
        'tiers_payant': invoice?.type === 'EFACT'
      });
      endSpan(assurSpan, 'OK');
    } catch (error) {
      endSpan(assurSpan, 'ERROR', error);
    }

    // Span eFact/eAttest
    const txSpan = createSpan(`mycarenet.${transactionType.toLowerCase()}.send`, {
      trace_id: traceId,
      parent_span_id: rootSpan.span_id,
      'transaction.id': invoice?.transaction_id,
      'oa.code': invoice?.oa_code,
      'endpoint': transactionType === 'EFACT' ? 'eFact' : 'eAttest'
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      addSpanEvent(txSpan, `${transactionType.toLowerCase()}.sent`, {
        'status': 'ACCEPTED',
        'amount': invoice?.total_amount
      });
      endSpan(txSpan, 'OK');
    } catch (error) {
      endSpan(txSpan, 'ERROR', error);
    }

    endSpan(rootSpan, 'OK');
    
    return { trace_id: traceId, root_span_id: rootSpan.span_id };
  }, [createSpan, endSpan, addSpanEvent]);

  // Tracer eHealthBox
  const traceEHealthBoxFlow = useCallback(async (operation, messageId) => {
    const traceId = `trace_ehbox_${Date.now()}`;
    
    const span = createSpan(`ehealthbox.${operation}`, {
      trace_id: traceId,
      'message.id': messageId,
      'endpoint': operation === 'consult' ? 'ehBox-Consultation' : 'ehBox-Publication'
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      addSpanEvent(span, `ehealthbox.${operation}.success`, {
        'message.id': messageId
      });
      endSpan(span, 'OK');
    } catch (error) {
      endSpan(span, 'ERROR', error);
    }

    return { trace_id: traceId, span_id: span.span_id };
  }, [createSpan, endSpan, addSpanEvent]);

  // Métriques clés
  const recordMetric = useCallback((metricName, value, attributes = {}) => {
    const metric = {
      name: metricName,
      value: value,
      timestamp: Date.now(),
      attributes: {
        ...attributes,
        'user.email': currentUser?.email
      }
    };

    console.log('[OTel] Metric recorded:', metric);

    // Export vers collector métriques
    // En production: POST vers http://localhost:4318/v1/metrics
  }, [currentUser]);

  return {
    createSpan,
    endSpan,
    addSpanEvent,
    traceRecipeFlow,
    traceMyCareNetFlow,
    traceEHealthBoxFlow,
    recordMetric
  };
};

// Helper pour hasher patient ID (RGPD)
function hashPatientId(patientId) {
  // En production: crypto.subtle.digest('SHA-256', ...)
  return `hash_${patientId.substring(0, 8)}`;
}