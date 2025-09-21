import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Define your translations here
const resources = {
  en: {
    translation: {
      // Navigation
      'navigation.home': 'Home',
      'navigation.report': 'Report',
      'navigation.heatmap': 'Heatmap',
      'navigation.leaderboard': 'Leaderboard',
      'navigation.community': 'Community',
      // Common
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.cancel': 'Cancel',
      'common.ok': 'OK',
      'common.submit': 'Submit',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.view': 'View',
      'common.search': 'Search',
      'common.filter': 'Filter',
      // Add other translation entries as needed...
    },
  },
  hi: {
    translation: {
      'navigation.home': 'होम',
      'navigation.report': 'रिपोर्ट',
      'navigation.heatmap': 'हीटमैप',
      'navigation.leaderboard': 'लीडरबोर्ड',
      'navigation.community': 'समुदाय',
      'common.loading': 'लोड हो रहा है...',
      'common.error': 'त्रुटि',
      'common.success': 'सफलता',
      'common.cancel': 'रद्द करें',
      'common.ok': 'ठीक है',
      'common.submit': 'जमा करें',
      'common.save': 'सेव करें',
      'common.delete': 'हटाएं',
      'common.edit': 'संपादित करें',
      'common.view': 'देखें',
      'common.search': 'खोजें',
      'common.filter': 'फिल्टर',
      // Add other translation entries as needed...
    },
  },
  // You can add other languages like 'es', 'fr', etc.
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: Localization.locale?.split('-')[0] || 'en', // Safe fallback if undefined
    fallbackLng: 'en', // Default language fallback
    interpolation: {
      escapeValue: false, // React already protects from XSS
    },
  });

export default i18n;
