import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const CabinetContext = createContext(null);

export function CabinetProvider({ children }) {
  const [selectedCabinetId, setSelectedCabinetId] = useState(() => {
    return localStorage.getItem('selectedCabinet') || 'all';
  });

  const { data: cabinets = [] } = useQuery({
    queryKey: ['cabinets'],
    queryFn: () => base44.entities.Cabinet.filter({ actif: true })
  });

  const selectedCabinet = cabinets.find(c => c.id === selectedCabinetId);
  const principalCabinet = cabinets.find(c => c.est_principal);

  useEffect(() => {
    localStorage.setItem('selectedCabinet', selectedCabinetId);
  }, [selectedCabinetId]);

  // Si aucun cabinet sélectionné et qu'il y a un principal, le sélectionner
  useEffect(() => {
    if (selectedCabinetId === 'all' && principalCabinet && cabinets.length > 0) {
      // On garde 'all' par défaut pour voir tout
    }
  }, [principalCabinet, cabinets, selectedCabinetId]);

  const value = {
    cabinets,
    selectedCabinetId,
    setSelectedCabinetId,
    selectedCabinet,
    principalCabinet,
    isMultiCabinet: cabinets.length > 1,
    // Filtre les données par cabinet si un cabinet est sélectionné
    filterByCabinet: (items, cabinetField = 'cabinet_id') => {
      if (selectedCabinetId === 'all') return items;
      return items.filter(item => item[cabinetField] === selectedCabinetId);
    }
  };

  return (
    <CabinetContext.Provider value={value}>
      {children}
    </CabinetContext.Provider>
  );
}

export function useCabinetContext() {
  const context = useContext(CabinetContext);
  if (!context) {
    // Retourner des valeurs par défaut si pas de provider
    return {
      cabinets: [],
      selectedCabinetId: 'all',
      setSelectedCabinetId: () => {},
      selectedCabinet: null,
      principalCabinet: null,
      isMultiCabinet: false,
      filterByCabinet: (items) => items
    };
  }
  return context;
}