import type { Alert, AlertType } from '../types';

export interface AlertImageConfig {
  imageUrl: string;
  fallbackSvg: string;
  bbox: {
    label: string;
    top: string;
    left: string;
    width: string;
    height: string;
    color: string;
  };
}

// Curated high-resolution dashcam snapshots for each defect/incident category
export const ALERT_IMAGE_MAP: Record<AlertType, {
  url: string;
  label: string;
  boxLabel: string;
  boxTop: string;
  boxLeft: string;
  boxWidth: string;
  boxHeight: string;
  accentColor: string;
}> = {
  pothole: {
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    label: 'Road Surface Defect (Pothole)',
    boxLabel: 'POTHOLE - 92%',
    boxTop: '48%',
    boxLeft: '32%',
    boxWidth: '38%',
    boxHeight: '36%',
    accentColor: '#ef4444',
  },
  waterlogging: {
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80',
    label: 'Monsoon Waterlogging Hazard',
    boxLabel: 'WATERLOGGING - 88%',
    boxTop: '52%',
    boxLeft: '18%',
    boxWidth: '64%',
    boxHeight: '38%',
    accentColor: '#00d4ff',
  },
  missing_signboard: {
    url: 'https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?auto=format&fit=crop&w=600&q=80',
    label: 'Damaged/Missing Signboard',
    boxLabel: 'MISSING SIGN - 76%',
    boxTop: '18%',
    boxLeft: '58%',
    boxWidth: '30%',
    boxHeight: '45%',
    accentColor: '#f59e0b',
  },
  missing_crossing: {
    url: 'https://images.unsplash.com/photo-1508873696983-2df5703bc20d?auto=format&fit=crop&w=600&q=80',
    label: 'Faded Pedestrian Crossing',
    boxLabel: 'FADED CROSSING - 81%',
    boxTop: '55%',
    boxLeft: '22%',
    boxWidth: '56%',
    boxHeight: '35%',
    accentColor: '#eab308',
  },
  vehicle_density: {
    url: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80',
    label: 'High Vehicle Congestion',
    boxLabel: 'CONGESTION CLUSTER - 95%',
    boxTop: '35%',
    boxLeft: '15%',
    boxWidth: '70%',
    boxHeight: '50%',
    accentColor: '#38bdf8',
  },
  bottleneck: {
    url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
    label: 'Road Chokepoint & Bottleneck',
    boxLabel: 'BOTTLENECK HAZARD - 87%',
    boxTop: '38%',
    boxLeft: '28%',
    boxWidth: '46%',
    boxHeight: '48%',
    accentColor: '#f97316',
  },
  pedestrian_risk: {
    url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=600&q=80',
    label: 'Pedestrian Roadway Hazard',
    boxLabel: 'PEDESTRIAN - 89%',
    boxTop: '32%',
    boxLeft: '38%',
    boxWidth: '24%',
    boxHeight: '52%',
    accentColor: '#f43f5e',
  },
  incident_hit_and_run: {
    url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    label: 'Hit & Run / Collision with ANPR',
    boxLabel: 'ANPR: VEHICLE MATCH',
    boxTop: '40%',
    boxLeft: '25%',
    boxWidth: '50%',
    boxHeight: '40%',
    accentColor: '#dc2626',
  },
};

export function getAlertImageData(alert: Alert) {
  const conf = ALERT_IMAGE_MAP[alert.type] || ALERT_IMAGE_MAP.pothole;
  const customPlate = alert.meta.plate_number;
  const boxLabel = (alert.type === 'incident_hit_and_run' && customPlate)
    ? `ANPR: ${customPlate}`
    : conf.boxLabel;

  return {
    ...conf,
    boxLabel,
  };
}
