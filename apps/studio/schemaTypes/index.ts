import { objects } from './objects';
import { documents } from './documents';
import { singletons } from './singletons';
import { shopifyTypes, SYNCED_TYPES } from './shopify';
import { requestTypes, SITE_WRITTEN_TYPES } from './requests';

export { SYNCED_TYPES, SITE_WRITTEN_TYPES };

export const SINGLETONS = [
  { id: 'homePage', title: 'Home', group: 'pages' },
  { id: 'storyPage', title: 'Story', group: 'pages' },
  { id: 'shopPages', title: 'Shop pages (bag, account, wishlist, all pieces)', group: 'pages' },
  { id: 'clientCarePage', title: 'Client care page', group: 'care' },
  { id: 'siteSettings', title: 'Site settings', group: 'settings' },
];

export const schemaTypes = [...objects, ...documents, ...singletons, ...shopifyTypes, ...requestTypes];
