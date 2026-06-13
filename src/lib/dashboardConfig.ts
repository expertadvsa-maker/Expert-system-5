import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { DashboardConfig, WidgetInstance } from './dashboardTypes';
import { DEFAULT_LAYOUT } from './widgetRegistry';

const DASHBOARD_VERSION = 1;

export async function loadDashboardConfig(uid: string): Promise<DashboardConfig | null> {
  try {
    const ref = doc(db, 'users', uid, 'config', 'dashboard');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as DashboardConfig;
    }
    return null;
  } catch (e) {
    console.error('Error loading dashboard config:', e);
    return null;
  }
}

export async function saveDashboardConfig(uid: string, widgets: WidgetInstance[]): Promise<void> {
  try {
    const ref = doc(db, 'users', uid, 'config', 'dashboard');
    const config: DashboardConfig = {
      version: DASHBOARD_VERSION,
      widgets: widgets.map((w, i) => ({ ...w, order: i })),
      lastUpdated: new Date().toISOString(),
    };
    // Clean up any undefined properties (like customTitle: undefined) which break Firestore
    const cleanConfig = JSON.parse(JSON.stringify(config));
    await setDoc(ref, cleanConfig, { merge: true });
  } catch (e) {
    console.error('Error saving dashboard config:', e);
    throw e;
  }
}

export function subscribeDashboardConfig(
  uid: string,
  onChange: (config: DashboardConfig | null) => void
): () => void {
  const ref = doc(db, 'users', uid, 'config', 'dashboard');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as DashboardConfig);
    } else {
      onChange(null);
    }
  }, (err) => {
    console.error('Dashboard config subscription error:', err);
    onChange(null);
  });
}

export function getDefaultConfig(): DashboardConfig {
  return {
    version: DASHBOARD_VERSION,
    widgets: DEFAULT_LAYOUT,
    lastUpdated: new Date().toISOString(),
  };
}
