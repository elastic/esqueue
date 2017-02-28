export default function (obj) {
  return (typeof obj === 'object' && !Array.isArray(obj) && obj !== null);
}