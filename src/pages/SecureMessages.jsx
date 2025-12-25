import React from 'react';
import SecureMessaging from '../components/messaging/SecureMessaging';

export default function SecureMessages() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Messagerie Sécurisée</h1>
        <p className="text-slate-600">Communications chiffrées avec vos patients</p>
      </div>
      <SecureMessaging />
    </div>
  );
}