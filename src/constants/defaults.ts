import type { BusinessSettings } from '@/types';

/**
 * Default business settings. All major rules are configurable.
 */
export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Gaming Zone',
  currency: 'PKR',
  currencyMinorUnits: 2,
  adminSharePercent: 50,
  managerSharePercent: 50,
  wifiExpenseTreatment: 'shared',
  adminBearsNonWifiExpenses: true,
  expenseCategories: [
    'Equipment',
    'Repair',
    'Maintenance',
    'Purchase',
    'WiFi',
    'Other',
  ],
  investmentCategories: [
    'Gaming PC',
    'AC',
    'Furniture',
    'Gaming Chair',
    'Monitor',
    'Networking',
    'Renovation',
    'Other',
  ],
  investmentRecoveryBasis: 'admin_net_share',
  settlementDay: 1,
  closedReasonRequired: false,
  dailyReminderEnabled: true,
  dailyReminderTime: '21:00',
  settlementRemindersEnabled: true,
};

export const DEFAULT_ADMIN = {
  id: 'user-admin',
  username: 'admin',
  display_name: 'Admin',
};

export const DEFAULT_MANAGER = {
  id: 'user-manager',
  username: 'manager',
  display_name: 'Manager',
};