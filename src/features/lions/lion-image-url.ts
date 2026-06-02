export const getLionImageUrl = (
  imagePath: string,
  publicBaseUrl = process.env.R2_PUBLIC_BASE_URL
): string | null => {
  const normalizedBaseUrl = publicBaseUrl?.replace(/\/+$/, "");
  const objectKey = imagePath.replace(/^\/+/, "");

  if (!normalizedBaseUrl || !objectKey) {
    return null;
  }

  return `${normalizedBaseUrl}/${objectKey}`;
};

