import { useEffect, useState } from 'react';
import { getAllSettings } from '@/repositories/settingsRepository';

interface PartnerNames {
  adminName: string;
  managerName: string;
}

let cached: PartnerNames | null = null;

/** Returns the configured partner display names (defaults: Admin / Friend). */
export function usePartnerNames(): PartnerNames {
  const [names, setNames] = useState<PartnerNames>(cached ?? { adminName: 'Admin', managerName: 'Friend' });
  useEffect(() => {
    let active = true;
    getAllSettings()
      .then((s) => {
        const next = {
          adminName: s.adminName || 'Admin',
          managerName: s.managerName || 'Friend',
        };
        cached = next;
        if (active) setNames(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return names;
}

/** Get friend name for a given viewer role (admin ↔ manager). */
export function useFriendName(viewerRole?: 'admin' | 'manager'): string {
  const { adminName, managerName } = usePartnerNames();
  return viewerRole === 'manager' ? adminName : managerName;
}