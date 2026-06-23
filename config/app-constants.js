// @ts-check

export const ROLES = {
  SUPERADMIN: 'superadmin',
  STOREADMIN: 'storeadmin',
  CUSTOMER: 'customer',
};

export const ROLE_VALUES = Object.values(ROLES);

export const ROLE_LABELS = {
  [ROLES.SUPERADMIN]: 'Superadmin',
  [ROLES.STOREADMIN]: 'Storeadmin',
  [ROLES.CUSTOMER]: 'Cliente',
};
