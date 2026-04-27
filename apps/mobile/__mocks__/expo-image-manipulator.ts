export const SaveFormat = {
  JPEG: 'jpeg',
  PNG: 'png',
  WEBP: 'webp',
} as const;

export const manipulateAsync = jest.fn(async () => ({
  uri: 'file:///mock/manipulated.jpg',
  width: 224,
  height: 224,
}));

export default {
  manipulateAsync,
  SaveFormat,
};
