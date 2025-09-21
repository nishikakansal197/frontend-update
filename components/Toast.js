import Toast from 'react-native-toast-message';

export const showToast = (type, title, message) => {
  Toast.show({
    type: type, // 'success', 'error', 'info'
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 60,
  });
};

export const showSuccessToast = (title, message) => {
  showToast('success', title, message);
};

export const showErrorToast = (title, message) => {
  showToast('error', title, message);
};

export const showInfoToast = (title, message) => {
  showToast('info', title, message);
};

export default Toast;