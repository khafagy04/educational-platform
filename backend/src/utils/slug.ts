export const toSlug = (value: string): string => {
  const slug = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);
  return slug || `course-${Date.now().toString(36)}`;
};
