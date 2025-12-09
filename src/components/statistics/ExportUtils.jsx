import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPDF = (data, tab) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('fr-FR');

  doc.setFontSize(18);
  doc.text('Rapport Statistiques - FluxMed', 14, 20);
  doc.setFontSize(11);
  doc.text(`Période: ${data.period}`, 14, 30);
  doc.text(`Généré le: ${date}`, 14, 36);

  if (tab === 'kpi') {
    doc.setFontSize(14);
    doc.text('Indicateurs Clés de Performance', 14, 50);
    
    const kpiData = [
      ['Indicateur', 'Valeur'],
      ['Chiffre d\'affaires total', `${data.kpi.revenue.toFixed(2)}€`],
      ['Chiffre d\'affaires payé', `${data.kpi.paidRevenue.toFixed(2)}€`],
      ['Montant impayé', `${data.kpi.unpaidAmount.toFixed(2)}€`],
      ['Nombre total de patients', data.kpi.patients],
      ['Nouveaux patients', data.kpi.newPatients],
      ['Rendez-vous total', data.kpi.appointments],
      ['Taux d\'occupation', `${data.kpi.occupationRate}%`]
    ];

    doc.autoTable({
      startY: 55,
      head: [kpiData[0]],
      body: kpiData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
  }

  doc.save(`statistiques_${date.replace(/\//g, '-')}.pdf`);
};

export const exportToCSV = (data, tab) => {
  let csvContent = `Rapport Statistiques - FluxMed\n`;
  csvContent += `Période,${data.period}\n`;
  csvContent += `Généré le,${new Date().toLocaleDateString('fr-FR')}\n\n`;

  if (tab === 'kpi') {
    csvContent += `Indicateurs Clés de Performance\n`;
    csvContent += `Indicateur,Valeur\n`;
    csvContent += `Chiffre d'affaires total,${data.kpi.revenue.toFixed(2)}€\n`;
    csvContent += `Chiffre d'affaires payé,${data.kpi.paidRevenue.toFixed(2)}€\n`;
    csvContent += `Montant impayé,${data.kpi.unpaidAmount.toFixed(2)}€\n`;
    csvContent += `Nombre total de patients,${data.kpi.patients}\n`;
    csvContent += `Nouveaux patients,${data.kpi.newPatients}\n`;
    csvContent += `Rendez-vous total,${data.kpi.appointments}\n`;
    csvContent += `Taux d'occupation,${data.kpi.occupationRate}%\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `statistiques_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};