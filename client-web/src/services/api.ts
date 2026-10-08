const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5149/api';

// Helper to inject the token
const getHeaders = () => {
  const token = localStorage.getItem('ik_jwt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  get: async (endpoint: string) => {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, { headers: getHeaders() });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw { response: { data: errorData }, status: res.status };
      }
      return await res.json();
    } catch (err) {
      console.error("[API ERROR]", err);
      throw err;
    }
  },
  
  post: async (endpoint: string, body: any) => {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    
    if (!res.ok) {
       const errorData = await res.json().catch(() => null);
       throw { response: { data: errorData }, status: res.status };
    }
    
    return res.json();
  }
};