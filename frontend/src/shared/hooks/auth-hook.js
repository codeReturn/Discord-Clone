import { useState, useCallback, useEffect } from 'react';

let logoutTimer;

export const useAuth = () => {
  const [token, setToken] = useState(null);
  const [tokenExpirationDate, setTokenExpirationDate] = useState(null);
  const [userId, setUserId] = useState(null);

  const login = useCallback((uid, token, expirationDate) => {
    setToken(token);
    setUserId(uid);
    
    const parsedExpirationDate = new Date(expirationDate);
    setTokenExpirationDate(parsedExpirationDate);
  
    localStorage.setItem(
      'userData',
      JSON.stringify({
        userId: uid,
        token: token,
        expirationDate: parsedExpirationDate.toISOString() 
      })
    );
  }, []);
  

  const logout = useCallback(() => {
    setToken(null);
    setTokenExpirationDate(null);
    setUserId(null);
    localStorage.removeItem('userData');
    window.location.href = "/";  
  }, []);

  useEffect(() => {
    if (token && tokenExpirationDate) {
      const remainingTime = tokenExpirationDate.getTime() - new Date().getTime();
      
      if (remainingTime <= 0) {
        logout(); 
      } else {
        logoutTimer = setTimeout(logout, remainingTime);
      }
    } else {
      clearTimeout(logoutTimer);
    }

    return () => clearTimeout(logoutTimer);
  }, [token, logout, tokenExpirationDate]);

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem('userData'));
    
    if (
      storedData &&
      storedData.token &&
      new Date(storedData.expirationDate) > new Date()
    ) {
      const expirationDate = new Date(storedData.expirationDate);
      login(storedData.userId, storedData.token, expirationDate);
    }
  }, [login]);

  return { token, login, logout, userId };
};
