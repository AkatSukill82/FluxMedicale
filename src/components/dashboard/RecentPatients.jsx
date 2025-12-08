import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, ChevronRight, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInYears } from "date-fns";

export default function RecentPatients({ patients, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Patients récents
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5 text-blue-600" />
            Patients récents
          </CardTitle>
          <Link to={createPageUrl("Patients")}>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-blue-600">
              Voir tous
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {patients.length > 0 ? (
          <div className="space-y-4">
            {patients.map((patient) => {
              const birthDate = patient.date_naissance ? new Date(patient.date_naissance) : null;
              const age = birthDate && !isNaN(birthDate.getTime())
                ? differenceInYears(new Date(), birthDate)
                : null;
              
              return (
                <div key={patient.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                      <span className="text-slate-700 font-semibold text-sm">
                        {patient.prenom?.[0]}{patient.nom?.[0]}
                      </span>
                    </div>
                    <div>
                      <h5 className="font-semibold text-slate-900 text-sm">
                        {patient.prenom} {patient.nom}
                      </h5>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        {age && (
                          <span>{age} ans</span>
                        )}
                        {patient.telephone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{patient.telephone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    className={`text-xs ${
                      patient.statut === 'Actif' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {patient.statut || 'Actif'}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600">Aucun patient enregistré</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}