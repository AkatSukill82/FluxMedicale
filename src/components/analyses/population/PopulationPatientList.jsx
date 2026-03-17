import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, ChevronDown, ChevronUp, User, Phone, Mail, ExternalLink, ArrowUpDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

function getAge(birthDate) {
  if (!birthDate) return null;
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function getPatientName(patient) {
  const nameObj = (patient.name || [])[0];
  if (!nameObj) return 'Patient inconnu';
  const given = (nameObj.given || []).join(' ');
  return `${nameObj.family || ''} ${given}`.trim() || 'Patient inconnu';
}

function getPatientCity(patient) {
  return (patient.address || [])[0]?.city || '';
}

export default function PopulationPatientList({ patients }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const pageSize = 25;

  const sorted = useMemo(() => {
    const list = [...patients];
    list.sort((a, b) => {
      let va, vb;
      switch (sortField) {
        case 'name': va = getPatientName(a); vb = getPatientName(b); break;
        case 'age': va = getAge(a.birthDate) ?? 999; vb = getAge(b.birthDate) ?? 999; break;
        case 'city': va = getPatientCity(a); vb = getPatientCity(b); break;
        case 'gender': va = a.gender || ''; vb = b.gender || ''; break;
        default: va = ''; vb = '';
      }
      if (typeof va === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return list;
  }, [patients, sortField, sortDir]);

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const term = search.toLowerCase();
    return sorted.filter(p => {
      const name = getPatientName(p).toLowerCase();
      const niss = ((p.identifier || [])[0]?.value || '').toLowerCase();
      const city = getPatientCity(p).toLowerCase();
      return name.includes(term) || niss.includes(term) || city.includes(term);
    });
  }, [sorted, search]);

  const pageCount = Math.ceil(filtered.length / pageSize);
  const currentPage = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortHeader = ({ field, children, className }) => (
    <th
      className={`text-left px-3 py-2 font-medium cursor-pointer hover:text-foreground transition-colors select-none ${className || ''}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && <ArrowUpDown className="w-3 h-3" />}
      </span>
    </th>
  );

  return (
    <Card className="print-content">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Liste des patients ({filtered.length})
          </CardTitle>
          {expanded && (
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs"
                  placeholder="Nom, NISS, ville..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                />
              </div>
              <Select value={`${pageSize}`} onValueChange={() => {}}>
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
              </Select>
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
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-xs text-muted-foreground">
                      <SortHeader field="name">Patient</SortHeader>
                      <SortHeader field="age" className="hidden md:table-cell">Âge</SortHeader>
                      <SortHeader field="gender" className="hidden md:table-cell">Sexe</SortHeader>
                      <th className="text-left px-3 py-2 font-medium hidden md:table-cell">NISS</th>
                      <SortHeader field="city" className="hidden lg:table-cell">Ville</SortHeader>
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
                      const genderLabel = patient.gender === 'male' ? '♂' : patient.gender === 'female' ? '♀' : '–';
                      const genderColor = patient.gender === 'male' ? 'text-blue-600' : patient.gender === 'female' ? 'text-pink-600' : '';
                      const phone = (patient.telecom || []).find(t => t.system === 'phone')?.value || '';
                      const email = (patient.telecom || []).find(t => t.system === 'email')?.value || '';
                      const city = getPatientCity(patient);

                      return (
                        <tr key={patient.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                              </div>
                              <div>
                                <span className="font-medium text-sm">{name}</span>
                                {patient.statut && patient.statut !== 'Actif' && (
                                  <Badge variant="outline" className="ml-1.5 text-[9px]">{patient.statut}</Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell">
                            {age !== null ? <Badge variant="outline" className="text-xs">{age} ans</Badge> : '–'}
                          </td>
                          <td className={`px-3 py-2 text-sm font-medium hidden md:table-cell ${genderColor}`}>{genderLabel}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground hidden md:table-cell font-mono">{niss}</td>
                          <td className="px-3 py-2 text-xs hidden lg:table-cell">{city || '–'}</td>
                          <td className="px-3 py-2 hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                              {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{phone}</span>}
                              {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email}</span>}
                              {!phone && !email && '–'}
                            </div>
                          </td>
                          <td className="px-3 py-2 hidden xl:table-cell">
                            <Badge variant={patient.insurance_status === 'EN_ORDRE' ? 'default' : 'outline'} className="text-[10px]">
                              {patient.insurance_regime || '–'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
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

              {pageCount > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} sur {filtered.length} patients
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(0)}>
                      ««
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>
                      ‹ Préc.
                    </Button>
                    <span className="flex items-center px-2 text-xs text-muted-foreground">{page + 1}/{pageCount}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
                      Suiv. ›
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pageCount - 1} onClick={() => setPage(pageCount - 1)}>
                      »»
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