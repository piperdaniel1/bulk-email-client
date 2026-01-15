export const DEFAULT_DOMAIN = 'setdomain.com';

export const EMAIL_ADDRESS_PATTERN = /^[a-z0-9._-]+$/;

export const ROUTES = {
  LOGIN: '/login',
  INBOX: '/',
  ADDRESS_INBOX: '/address/:addressId',
  THREAD: '/thread/:threadId',
  COMPOSE: '/compose',
  SETTINGS: '/settings',
} as const;
