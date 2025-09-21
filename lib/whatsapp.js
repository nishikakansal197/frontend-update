import { Linking } from 'react-native';

const WHATSAPP_NUMBER = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER;

export const openWhatsAppChat = (message = '', phoneNumber = WHATSAPP_NUMBER) => {
  const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
  
  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        return Linking.openURL(webUrl);
      }
    })
    .catch((err) => console.error('Error opening WhatsApp:', err));
};

export const openWhatsAppWithOfficial = (official, message = '') => {
  const defaultMessage = `Hello ${official.name}, I would like to inquire about ${official.department} services. ${message}`;
  openWhatsAppChat(defaultMessage, official.whatsapp_number);
};