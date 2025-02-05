import { useEffect, useRef, useContext } from 'react';
import openSocket from 'socket.io-client';
import { AuthContext } from '../context/auth-context';

const useSocket = () => {
  const socketRef = useRef(null);
  const auth = useContext(AuthContext);

  useEffect(() => {
    if (!auth.userId || socketRef.current) return;

    const socket = openSocket('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      query: { userId: auth.userId },
      path: '/networkserver/socket.io/',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.isReady = false;
    
    socket.on('connect', () => {
      socket.isReady = true;
    });

    socket.on('disconnect', () => {
      socket.isReady = false;
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [auth.userId]);

  return socketRef.current;
};

export default useSocket;