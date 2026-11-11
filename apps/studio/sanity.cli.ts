import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'replace-me',
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
  studioHost: 'nevma-style',
  deployment: {
    appId: 'i4saaa43qqij62vopc77lme7',
    autoUpdates: true,
  },
});

