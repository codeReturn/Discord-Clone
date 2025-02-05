import { useEffect, useState, Suspense, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Navigate, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DashboardServer from './pages/DashboardServer';
import DashboardUser from './pages/DashboardUser';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordUpdate from './pages/ResetPasswordUpdate';

import { useAuth } from './shared/hooks/auth-hook';
import { AuthContext } from './shared/context/auth-context';

import { ToastContainer, Bounce } from 'react-toastify';
import { Button } from 'react-bootstrap';
import LoadingSpinner from './shared/components/UIElements/LoadingSpinner';

import axios from 'axios';
import { toast } from 'react-toastify';

function App() {
  const { token, login, logout, userId } = useAuth();

  const [user, setUser] = useState(null)

  const fetchUser = async () => {
      try {    
          const response = await axios.get(
              'http://localhost:5000/networkserver/api/users/getuserinfo',
              {
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': 'Bearer ' + token, 
                  }
              }
          );
  
          if (response.data.user) {    
              setUser(response.data.user);
          }
          
      } catch (err) {
          toast.error(err.response?.data?.message || 'An error occurred');
      } 
  };
  
  useEffect(() => {
      if(token) fetchUser()
  }, [token]);

  const [isLoading, setIsLoading] = useState(true);

  let routes;

  if (token) {
    routes = (
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/server/:id" element={<DashboardServer user={user} />} />
        <Route path="/user/:username" element={<DashboardUser user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  } else {
    routes = (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/resetpassword" element={<ResetPassword />} />
        <Route path="/resetpasswordupdate/:link" element={<ResetPasswordUpdate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Theme
  const localTheme = localStorage.getItem('theme');
  const [theme, setTheme] = useState(localTheme || 'white-theme');

  useLayoutEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 3000); 
  }, []);

  return (
    <>
      <AuthContext.Provider
        value={{
          isLoggedIn: !!token,
          token: token,
          userId: userId,
          login: login,
          logout: logout,
        }}
      >
        <ToastContainer
          position="bottom-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          transition={Bounce}
        />

        <div className="main">
          <div className="theme-picker">
            {theme === 'dark-theme' ? (
              <Button
                variant="light"
                onClick={() => {
                  document.body.setAttribute('data-theme', 'white-theme');
                  setTheme('white-theme');
                  localStorage.setItem('theme', 'white-theme');
                }}
                className="white-theme-switcher"
              >
                <i className="fa-brands fa-affiliatetheme"></i>
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  document.body.setAttribute('data-theme', 'dark-theme');
                  setTheme('dark-theme');
                  localStorage.setItem('theme', 'dark-theme');
                }}
                className="dark-theme-switcher"
              >
                <i className="fa-brands fa-affiliatetheme"></i>
              </Button>
            )}
          </div>

          <BrowserRouter>
          <div class="full-screen"></div>
          <main>
            {isLoading ? (
              <Suspense>
                <LoadingSpinner asOverlay={true} />
              </Suspense>
            ) : (
              <Suspense fallback={<LoadingSpinner asOverlay={true} />}>
                {routes}
              </Suspense>
            )}
          </main>
          </BrowserRouter>
        </div>
      </AuthContext.Provider>
    </>
  );
}

export default App;
