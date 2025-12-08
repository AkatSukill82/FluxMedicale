import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TodayAppointments({ appointments, patients, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Rendez-vous d'aujourd'hui
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Calendar className="w-5 h-5 text-blue-600" />
          Rendez-vous d'aujourd'hui
          <Badge className="ml-2 bg-blue-100 text-blue-800">
            {appointments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((rdv) => {
              const patient = patients.find(p => p.id === rdv.patient_id);
              return (
                <div key={rdv.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {patient ? `${patient.prenom} ${patient.nom}` : 'Patient inconnu'}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {rdv.heure_debut}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {rdv.salle || 'Cabinet'}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {rdv.type_consultation} • {rdv.motif}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={`${
                        rdv.statut === 'Confirmé' ? 'bg-green-100 text-green-800' :
                        rdv.statut === 'En cours' ? 'bg-blue-100 text-blue-800' :
                        rdv.statut === 'Terminé' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {rdv.statut}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Aucun rendez-vous aujourd'hui</h3>
            <p className="text-slate-600 mb-6">Vous avez une journée libre !</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}