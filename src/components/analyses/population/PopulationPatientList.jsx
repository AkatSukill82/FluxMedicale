import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp, User, Calendar, Phone, Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

function getAge(birthDate) {
  if (!birthDate) return '?';
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getPatientName(patient) {
  const nameObj = (patient.name || [])[0];
  if (!nameObj) return 'Patient inconnu';
  const given = (nameObj.given || []).join(' ');
  return `${nameObj.family || ''} ${given}`.trim() || 'Patient inconnu';
}

function getPatientPhone(patient) {
  const tel = (patient.telecom || []).find(t => t.system === 'phone');
  return tel?.value || '';
}

function getPatientEmail(patient) {
  const email = (patient.telecom || []).find(t => t.system === 'email');
  return email?.value || '';
}

export default function PopulationPatientList({ patients }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const filtered = useMemo(() => {
    if (!search) return patients;
    const term = search.toLowerCase();
    return patients.filter(p => {
      const name = getPatientName(p).toLowerCase();
      const niss = ((p.identifier || [])[0]?.value || '').toLowerCase();
      return name.includes(term) || niss.includes(term);
    });
  }, [patients, search]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const currentPage = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Liste des patients ({filtered.length})
          </CardTitle>
          {expanded && (
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-xs"
                placeholder="Rechercher dans la cohorte..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {currentPage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun patient ne correspond aux filtres</p>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-xs text-muted-foreground">
                      <th className="text-left px-3 py-2 font-medium">Patient</th>
                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">NISS</th>
                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Âge</th>
                      <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Sexe</th>
                      <th className="text-left px-3 py-2 font-medium hidden lg:table-cell">Contact</th>
                      <th className="text-left px-3 py-2 font-medium hidden xl:table-cell">Assurance</th>
                      <th className="px-3 py-2 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPage.map(patient => {
                      const name = getPatientName(patient);
                      const niss = ((patient.identifier || [])[0]?.value) || '–';
                      const age = getAge(patient.birthDate);
                      const gender = patient.gender === 'male' ? '♂ Homme' : patient.gender === 'female' ? '♀ Femme' : '–';
                      const phone = getPatientPhone(patient);
                      const email = getPatientEmail(patient);

                      return (
                        <tr key={patient.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <span className="font-medium text-sm">{name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell font-mono">{niss}</td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">{age} ans</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs hidden lg:table-cell">{gender}</td>
                          <td className="px-3 py-2.5 hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{phone}</span>}
                              {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email}</span>}
                              {!phone && !email && '–'}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden xl:table-cell">
                            <Badge variant={patient.insurance_status === 'EN_ORDRE' ? 'default' : 'outline'} className="text-[10px]">
                              {patient.insurance_regime || '–'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link to={`/Patients?id=${patient.id}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} sur {pageCount} · {filtered.length} patients
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      Précédent
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}