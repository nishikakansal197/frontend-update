const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const uploadImageToCloudinary = async (imageUri) => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      error: null,
    };
  } catch (error) {
    return {
      url: null,
      publicId: null,
      error: error.message,
    };
  }
};

export const uploadMultipleImages = async (imageUris) => {
  try {
    const uploadPromises = imageUris.map(uri => uploadImageToCloudinary(uri));
    const results = await Promise.all(uploadPromises);
    
    const successfulUploads = results.filter(result => !result.error);
    const failedUploads = results.filter(result => result.error);

    return {
      successful: successfulUploads,
      failed: failedUploads,
      error: failedUploads.length > 0 ? 'Some uploads failed' : null,
    };
  } catch (error) {
    return {
      successful: [],
      failed: [],
      error: error.message,
    };
  }
};