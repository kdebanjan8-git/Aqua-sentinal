import L from 'leaflet';

export function createSensorIcon(status, isAnomalous, wqiGrade, riskLevel, isCriticalOutbreak) {
  let color = '#10B981'; // vibrant emerald green (Low risk / Safe)
  let glowClass = 'pulse-green';
  let badgeBorder = 'border-white';
  let size = 32;

  const risk = (riskLevel || '').toLowerCase();
  const isCritical = isCriticalOutbreak || risk === 'high' || risk === 'critical';

  if (isCritical) {
    color = '#EF4444'; // emergency red
    glowClass = 'pulse-red';
    size = 36;
  } else if (risk === 'moderate' || status === 'warning' || isAnomalous) {
    color = '#F59E0B'; // amber (Moderate warning)
    glowClass = '';
    size = 28;
  }

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group">
      ${isCritical ? `<div class="absolute w-10 h-10 rounded-full ${glowClass}" style="background-color: ${color}35;"></div>` : ''}
      <div class="w-6 h-6 rounded-full border-2 ${badgeBorder} flex items-center justify-center text-white shadow-md transition-transform duration-200 group-hover:scale-125" style="background-color: ${color};">
        <svg class="w-3.5 h-3.5 drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-sensor-icon',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)]
  });
}

export function createWaterSourceIcon(type, status, riskLevel, isCriticalOutbreak) {
  let color = '#0284C7'; // sky-600
  let ringColor = 'rgba(2, 132, 199, 0.35)';

  const risk = (riskLevel || '').toLowerCase();
  const isCritical = isCriticalOutbreak || status === 'critical' || risk === 'high';

  if (isCritical) {
    color = '#EF4444';
    ringColor = 'rgba(239, 68, 68, 0.4)';
  } else if (risk === 'moderate' || status === 'warning') {
    color = '#F59E0B';
    ringColor = 'rgba(245, 158, 11, 0.35)';
  }

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group">
      ${isCritical ? `<div class="absolute w-10 h-10 rounded-2xl animate-pulse" style="background-color: ${ringColor};"></div>` : ''}
      <div class="w-7 h-7 rounded-xl border-2 border-white flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-125" style="background-color: ${color};">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-source-icon',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
}

export function createSymptomIcon(severity) {
  const colorMap = {
    critical: '#DC2626',
    severe: '#EA580C',
    moderate: '#D97706',
    mild: '#0284C7'
  };
  const color = colorMap[severity] || '#D97706';

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group">
      <div class="w-4 h-4 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform duration-200 group-hover:scale-150" style="background-color: ${color};">
        <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-symptom-icon',
    html,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8]
  });
}
