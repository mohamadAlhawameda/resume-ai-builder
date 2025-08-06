// hooks/useAuthStatus.ts
import { useEffect, useState } from 'react';

export default function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkToken = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    setIsAuthenticated(!!token);
  };

  useEffect(() => {
    checkToken();

    const handleStorageChange = () => {
      checkToken();
    };

    // Listen for localStorage/sessionStorage updates from other tabs or code
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChanged', handleStorageChange); // custom

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChanged', handleStorageChange);
    };
  }, []);

  return isAuthenticated;
}
