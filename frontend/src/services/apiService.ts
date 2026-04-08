// Example API service using fetch or axios
export const fetchData = async (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const res = await fetch(`${baseUrl}${endpoint}`);
  return res.json();
};
