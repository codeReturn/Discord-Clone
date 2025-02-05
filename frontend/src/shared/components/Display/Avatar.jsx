import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import useSocket from '../../util/socket';

const Avatar = ({ chat, user }) => {
  const socket = useSocket();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [avatar, setAvatar] = useState('/avatars/modelname/neutral.png');
  const lastDetectedExpression = useRef('neutral');
  const animationFrameId = useRef(null);
  const modelsLoaded = useRef(false);
  
  // Throttle face detection to run at most every 100ms
  const THROTTLE_INTERVAL = 100;
  const lastDetectionTime = useRef(0);

  // Debounced socket emission
  const debouncedEmit = useCallback((type, data) => {
    if (!socket) return;
    
    if (type === 'userExpressionUpdate') {
      // Clear any pending timeout
      if (debouncedEmit.timeout) {
        clearTimeout(debouncedEmit.timeout);
      }
      
      // Set new timeout
      debouncedEmit.timeout = setTimeout(() => {
        socket.emit(type, data);
      }, 500); // Debounce for 500ms
    } else {
      socket.emit(type, data);
    }
  }, [socket]);

  // Memoize getAvatarImage to prevent unnecessary recalculations
  const getAvatarImage = useCallback((expressions) => {
    const thresholds = {
      happy: 0.6,
      sad: 0.6,
      angry: 0.6,
      surprised: 0.6,
      confused: 0.6,
      disgusted: 0.6,
      fearful: 0.6
    };

    for (const [expression, threshold] of Object.entries(thresholds)) {
      if (expressions[expression] > threshold) {
        return `/avatars/modelname/${expression}.png`;
      }
    }
    return '/avatars/modelname/neutral.png';
  }, []);

  const updateAvatar = useCallback((expressions) => {
    const dominantExpression = Object.keys(expressions).reduce((a, b) =>
      expressions[a] > expressions[b] ? a : b
    );

    if (dominantExpression !== lastDetectedExpression.current) {
      lastDetectedExpression.current = dominantExpression;
      const avatarImage = getAvatarImage(expressions);
      setAvatar(avatarImage);

      debouncedEmit('userExpressionUpdate', {
        chat,
        user,
        expression: avatarImage,
      });
    }
  }, [chat, user, getAvatarImage, debouncedEmit]);

  // Separate face detection logic
  const detectFaces = useCallback(async (video, canvas) => {
    if (!video.videoWidth || !video.videoHeight) return;

    const now = Date.now();
    if (now - lastDetectionTime.current < THROTTLE_INTERVAL) {
      animationFrameId.current = requestAnimationFrame(() => detectFaces(video, canvas));
      return;
    }
    lastDetectionTime.current = now;

    try {
      const detections = await faceapi
        .detectAllFaces(
          video, 
          new faceapi.TinyFaceDetectorOptions({ 
            inputSize: 160, // Reduced input size
            scoreThreshold: 0.5 
          })
        )
        .withFaceExpressions();

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        updateAvatar(detections[0].expressions);
      }
    } catch (error) {
      console.error('Error in face detection:', error);
    }

    animationFrameId.current = requestAnimationFrame(() => detectFaces(video, canvas));
  }, [updateAvatar]);

  const handleVideoOnPlay = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    detectFaces(video, canvas);
    
    debouncedEmit('addAvatar', {
      chat,
      user,
    });
  }, [chat, user, detectFaces, debouncedEmit]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models'),
        ]);
        console.log('Models loaded successfully');
        modelsLoaded.current = true;
        startVideo();
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user', 
            width: 150, 
            height: 150, 
            frameRate: { ideal: 30 } // Reduced from 60
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    loadModels();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (debouncedEmit.timeout) {
        clearTimeout(debouncedEmit.timeout);
      }
    };
  }, [chat, debouncedEmit]);

  return (
    <div className="avatar-tracker">
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        playsInline 
        onPlay={handleVideoOnPlay} 
        width={80}
        height={80}
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-contain" 
        style={{ width: '0px', height: '0px' }} 
      />
    </div>
  );
};

export default Avatar;