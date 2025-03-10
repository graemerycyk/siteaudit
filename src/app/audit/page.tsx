'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import Image from 'next/image';

interface CapturedImage {
  dataUrl: string;
  title: string;
  annotation: string | null;
  originalDataUrl?: string;
}

// IndexedDB helper functions
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SiteAuditDB', 1);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
};

const saveToIndexedDB = async (storeName: string, data: unknown): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => {
        console.error(`Error saving to ${storeName}:`, event);
        reject(`Error saving to ${storeName}`);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error in saveToIndexedDB:', error);
    throw error;
  }
};

const getFromIndexedDB = async (storeName: string, key: string | number): Promise<{key: string, data: unknown} | undefined> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error(`Error getting from ${storeName}:`, event);
        reject(`Error getting from ${storeName}`);
      };
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error in getFromIndexedDB:', error);
    throw error;
  }
};

// Image compression function
const compressImage = (dataUrl: string, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject('Could not get canvas context');
        return;
      }
      
      // Draw image to canvas
      ctx.drawImage(img, 0, 0);
      
      // Get compressed data URL
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => reject('Error loading image for compression');
    img.src = dataUrl;
  });
};

export default function AuditPage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [userName, setUserName] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [showOfflineNotice, setShowOfflineNotice] = useState(true);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [wasStreamActive, setWasStreamActive] = useState(false);
  const [reportStarted, setReportStarted] = useState(false);
  const [dbInitialized, setDbInitialized] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize IndexedDB
  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        setDbInitialized(true);
        console.log('📦 IndexedDB initialized');
      } catch (error) {
        console.error('Error initializing IndexedDB:', error);
        // Fall back to localStorage if IndexedDB fails
        alert('Your browser may have limited storage capabilities. Some features might not work properly.');
      }
    };
    
    setupDB();
  }, []);
  
  // Load saved data on component mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        if (!dbInitialized) return;
        
        // Try to load from IndexedDB first
        try {
          const savedImages = await getFromIndexedDB('settings', 'capturedImages');
          if (savedImages && savedImages.data) {
            setCapturedImages(savedImages.data as CapturedImage[]);
            console.log('📦 Loaded saved images from IndexedDB');
          }
          
          const savedUserName = await getFromIndexedDB('settings', 'userName');
          if (savedUserName && savedUserName.data) {
            setUserName(savedUserName.data as string);
            console.log('📦 Loaded saved user name from IndexedDB');
          }
          
          const savedSignature = await getFromIndexedDB('settings', 'signature');
          if (savedSignature && savedSignature.data) {
            setSignature(savedSignature.data as string);
            console.log('📦 Loaded saved signature from IndexedDB');
          }
          
          const savedReportStarted = await getFromIndexedDB('settings', 'reportStarted');
          if (savedReportStarted && savedReportStarted.data === true) {
            setReportStarted(true);
            console.log('📦 Loaded saved report started state from IndexedDB');
          }
        } catch (dbError) {
          console.error('Error loading from IndexedDB, falling back to localStorage:', dbError);
          
          // Fall back to localStorage
          const savedImages = localStorage.getItem('siteaudit_captured_images');
          const savedUserName = localStorage.getItem('siteaudit_user_name');
          const savedSignature = localStorage.getItem('siteaudit_signature');
          const savedReportStarted = localStorage.getItem('siteaudit_report_started');
          
          if (savedImages) {
            setCapturedImages(JSON.parse(savedImages));
            console.log('📦 Loaded saved images from localStorage');
          }
          
          if (savedUserName) {
            setUserName(savedUserName);
            console.log('📦 Loaded saved user name from localStorage');
          }
          
          if (savedSignature) {
            setSignature(savedSignature);
            console.log('📦 Loaded saved signature from localStorage');
          }
          
          if (savedReportStarted === 'true') {
            setReportStarted(true);
            console.log('📦 Loaded saved report started state from localStorage');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    if (dbInitialized) {
      loadSavedData();
    }
  }, [dbInitialized]);
  
  // Save captured images when they change
  useEffect(() => {
    const saveImages = async () => {
      if (!dbInitialized || capturedImages.length === 0) return;
      
      try {
        // Save to IndexedDB
        await saveToIndexedDB('settings', { key: 'capturedImages', data: capturedImages });
        console.log('💾 Saved images to IndexedDB');
      } catch (dbError) {
        console.error('Error saving to IndexedDB, falling back to localStorage:', dbError);
        
        // Fall back to localStorage with a try-catch to handle quota errors
        try {
          localStorage.setItem('siteaudit_captured_images', JSON.stringify(capturedImages));
          console.log('💾 Saved images to localStorage');
        } catch (localStorageError) {
          console.error('Error saving to localStorage:', localStorageError);
          alert('Storage limit reached. Please export your report or delete some images.');
        }
      }
    };
    
    if (capturedImages.length > 0 && dbInitialized) {
      saveImages();
    }
  }, [capturedImages, dbInitialized]);
  
  // Save user name when it changes
  useEffect(() => {
    const saveUserName = async () => {
      if (!dbInitialized || !userName) return;
      
      try {
        await saveToIndexedDB('settings', { key: 'userName', data: userName });
        console.log('💾 Saved user name to IndexedDB');
      } catch (error) {
        console.error('Error saving user name to IndexedDB:', error);
        
        try {
          localStorage.setItem('siteaudit_user_name', userName);
          console.log('💾 Saved user name to localStorage');
        } catch (localStorageError) {
          console.error('Error saving user name to localStorage:', localStorageError);
        }
      }
    };
    
    if (userName && dbInitialized) {
      saveUserName();
    }
  }, [userName, dbInitialized]);
  
  // Save signature when it changes
  useEffect(() => {
    const saveSignature = async () => {
      if (!dbInitialized || !signature) return;
      
      try {
        await saveToIndexedDB('settings', { key: 'signature', data: signature });
        console.log('💾 Saved signature to IndexedDB');
      } catch (error) {
        console.error('Error saving signature to IndexedDB:', error);
        
        try {
          localStorage.setItem('siteaudit_signature', signature);
          console.log('💾 Saved signature to localStorage');
        } catch (localStorageError) {
          console.error('Error saving signature to localStorage:', localStorageError);
        }
      }
    };
    
    if (signature && dbInitialized) {
      saveSignature();
    }
  }, [signature, dbInitialized]);
  
  // Save reportStarted state when it changes
  useEffect(() => {
    const saveReportStarted = async () => {
      if (!dbInitialized) return;
      
      try {
        await saveToIndexedDB('settings', { key: 'reportStarted', data: reportStarted });
        console.log('💾 Saved report started state to IndexedDB');
      } catch (error) {
        console.error('Error saving report started state to IndexedDB:', error);
        
        try {
          localStorage.setItem('siteaudit_report_started', reportStarted.toString());
          console.log('💾 Saved report started state to localStorage');
        } catch (localStorageError) {
          console.error('Error saving report started state to localStorage:', localStorageError);
        }
      }
    };
    
    if (dbInitialized) {
      saveReportStarted();
    }
  }, [reportStarted, dbInitialized]);
  
  // Initialize camera
  const startCamera = async () => {
    console.log('🔍 startCamera function called');
    setIsLoadingCamera(true);
    
    try {
      console.log('📱 Browser info:', 
        navigator.userAgent, 
        'isSafari:', /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      );
      
      // First try to get the environment camera with ideal resolution
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        },
        audio: false
      };
      
      console.log('📷 Requesting camera with constraints:', JSON.stringify(constraints));
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ MediaDevices API not supported in this browser');
        alert('Camera API not supported in this browser. Please try a different browser.');
        setIsLoadingCamera(false);
        return;
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Camera stream obtained successfully');
      
      // Log track information
      const videoTracks = mediaStream.getVideoTracks();
      console.log('📹 Video tracks:', videoTracks.length);
      videoTracks.forEach((track, index) => {
        console.log(`Track ${index + 1}:`, track.label, 'Enabled:', track.enabled, 'Settings:', track.getSettings());
      });
      
      setStream(mediaStream);
      setWasStreamActive(false);
      
      if (videoRef.current) {
        console.log('🎥 Setting video source object');
        videoRef.current.srcObject = mediaStream;
        videoRef.current.playsInline = true;
        
        // Wait for video to be loaded before playing
        console.log('⏳ Adding loadedmetadata event listener');
        videoRef.current.addEventListener('loadedmetadata', () => {
          console.log('📊 Video metadata loaded, attempting to play');
          console.log('📐 Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          
          if (videoRef.current) {
            console.log('▶️ Calling play() method');
            videoRef.current.play()
              .then(() => {
                console.log('🎬 Video playback started successfully');
                console.log('📺 Video element properties:', {
                  width: videoRef.current?.offsetWidth,
                  height: videoRef.current?.offsetHeight,
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight,
                  paused: videoRef.current?.paused,
                  ended: videoRef.current?.ended,
                  readyState: videoRef.current?.readyState,
                  error: videoRef.current?.error
                });
                setIsLoadingCamera(false);
              })
              .catch(e => {
                console.error('❌ Error playing video:', e);
                alert('Error playing video. Please check console for details.');
                setIsLoadingCamera(false);
              });
          }
        });
        
        // Add error event listener
        videoRef.current.addEventListener('error', (e) => {
          console.error('❌ Video element error:', e);
          setIsLoadingCamera(false);
        });
      } else {
        console.error('❌ videoRef.current is null');
        setIsLoadingCamera(false);
      }
    } catch (error) {
      console.error('❌ Error accessing camera:', error);
      // If environment camera fails, try any available camera
      try {
        console.log('🔄 Falling back to default camera');
        const fallbackConstraints = {
          video: true,
          audio: false
        };
        console.log('📷 Requesting fallback camera with constraints:', JSON.stringify(fallbackConstraints));
        const mediaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        console.log('✅ Fallback camera stream obtained');
        
        // Log track information
        const videoTracks = mediaStream.getVideoTracks();
        console.log('📹 Fallback video tracks:', videoTracks.length);
        videoTracks.forEach((track, index) => {
          console.log(`Fallback track ${index + 1}:`, track.label, 'Enabled:', track.enabled, 'Settings:', track.getSettings());
        });
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          console.log('🎥 Setting fallback video source object');
          videoRef.current.srcObject = mediaStream;
          videoRef.current.playsInline = true;
          
          console.log('⏳ Adding fallback loadedmetadata event listener');
          videoRef.current.addEventListener('loadedmetadata', () => {
            console.log('📊 Fallback video metadata loaded, attempting to play');
            console.log('📐 Fallback video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
            
            if (videoRef.current) {
              console.log('▶️ Calling fallback play() method');
              videoRef.current.play()
                .then(() => {
                  console.log('🎬 Fallback video playback started successfully');
                  console.log('📺 Fallback video element properties:', {
                    width: videoRef.current?.offsetWidth,
                    height: videoRef.current?.offsetHeight,
                    videoWidth: videoRef.current?.videoWidth,
                    videoHeight: videoRef.current?.videoHeight,
                    paused: videoRef.current?.paused,
                    ended: videoRef.current?.ended,
                    readyState: videoRef.current?.readyState,
                    error: videoRef.current?.error
                  });
                  setIsLoadingCamera(false);
                })
                .catch(e => {
                  console.error('❌ Error playing fallback video:', e);
                  alert('Error playing video. Please check console for details.');
                  setIsLoadingCamera(false);
                });
            }
          });
          
          // Add error event listener
          videoRef.current.addEventListener('error', (e) => {
            console.error('❌ Fallback video element error:', e);
            setIsLoadingCamera(false);
          });
        } else {
          console.error('❌ videoRef.current is null for fallback');
          setIsLoadingCamera(false);
        }
      } catch (fallbackError) {
        console.error('❌ Error accessing any camera:', fallbackError);
        alert('Error accessing camera. Please make sure you have granted camera permissions.');
        setIsLoadingCamera(false);
      }
    }
  };
  
  // Stop camera - wrapped in useCallback to prevent dependency changes
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setWasStreamActive(true);
    }
    setIsLoadingCamera(false);
  }, [stream]);
  
  // Handle page visibility changes to refresh camera when returning to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Page is now visible');
        
        // If stream was active before but is now stopped or null, restart it
        if (wasStreamActive && (!stream || stream.getVideoTracks().some(track => !track.enabled || track.readyState !== 'live'))) {
          console.log('🔄 Restarting camera after page visibility change');
          
          // Stop any existing stream first
          if (stream) {
            stopCamera();
          }
          
          // Short delay before restarting
          setTimeout(() => {
            startCamera();
          }, 300);
        }
      } else if (document.visibilityState === 'hidden') {
        console.log('📱 Page is now hidden');
        
        // Remember if stream was active
        setWasStreamActive(!!stream);
      }
    };
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stream, wasStreamActive, stopCamera, startCamera]);
  
  // Capture image
  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas to a square with the same dimensions
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;
        
        // Calculate the cropping position to get the center of the video
        const xStart = (video.videoWidth - size) / 2;
        const yStart = (video.videoHeight - size) / 2;
        
        // Draw the video frame onto the canvas, cropping to a square
        context.drawImage(
          video,
          xStart, yStart, size, size,  // Source coordinates and dimensions
          0, 0, size, size             // Destination coordinates and dimensions
        );
        
        // Get the data URL and compress it
        const rawDataUrl = canvas.toDataURL('image/png');
        let dataUrl;
        
        try {
          // Compress the image to reduce storage requirements
          dataUrl = await compressImage(rawDataUrl, 0.7);
          console.log('🗜️ Image compressed successfully');
        } catch (error) {
          console.error('Error compressing image:', error);
          dataUrl = rawDataUrl; // Fall back to uncompressed image
        }
        
        // Add the image with a temporary title
        const tempTitle = `Image ${capturedImages.length + 1}`;
        const newImages = [...capturedImages, { dataUrl, title: tempTitle, annotation: null }];
        setCapturedImages(newImages);
        
        // Set the current image index to the newly added image to immediately show annotation UI
        setCurrentImageIndex(newImages.length - 1);
        
        // Focus on the title input field
        setTimeout(() => {
          const titleInput = document.getElementById('image-title-input');
          if (titleInput) {
            titleInput.focus();
          }
        }, 100);
      }
    }
  };
  
  // Handle annotation drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior to stop scrolling on touch devices
    e.preventDefault();
    
    if (annotationCanvasRef.current && currentImageIndex !== null) {
      setIsDrawing(true);
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.beginPath();
        
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          // For touch events
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          // For mouse events
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        // Scale coordinates to match canvas size
        x = (x / rect.width) * canvas.width;
        y = (y / rect.height) * canvas.height;
        
        context.moveTo(x, y);
      }
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior to stop scrolling on touch devices
    e.preventDefault();
    
    if (isDrawing && annotationCanvasRef.current) {
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          // For touch events
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          // For mouse events
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        // Scale coordinates to match canvas size
        x = (x / rect.width) * canvas.width;
        y = (y / rect.height) * canvas.height;
        
        context.lineTo(x, y);
        context.strokeStyle = 'red';
        context.lineWidth = 3;
        context.stroke();
        
        // Start a new path to avoid connecting lines when drawing multiple strokes
        context.beginPath();
        context.moveTo(x, y);
      }
    }
  };
  
  const stopDrawing = async (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior if event is provided
    if (e) e.preventDefault();
    
    if (isDrawing && annotationCanvasRef.current && currentImageIndex !== null) {
      setIsDrawing(false);
      
      const canvas = annotationCanvasRef.current;
      // Get the raw data URL
      const rawDataUrl = canvas.toDataURL('image/png');
      let combinedImageDataUrl;
      
      try {
        // Compress the image to reduce storage requirements
        combinedImageDataUrl = await compressImage(rawDataUrl, 0.7);
        console.log('🗜️ Annotation compressed successfully');
      } catch (error) {
        console.error('Error compressing annotation:', error);
        combinedImageDataUrl = rawDataUrl; // Fall back to uncompressed image
      }
      
      // Update the captured image with the combined image+annotation
      const updatedImages = [...capturedImages];
      // Store the combined result as the main image
      updatedImages[currentImageIndex].annotation = combinedImageDataUrl;
      setCapturedImages(updatedImages);
      
      console.log('💾 Saved annotated image');
    }
  };
  
  // Handle signature drawing
  const startSignatureDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior to stop scrolling on touch devices
    e.preventDefault();
    
    if (signatureCanvasRef.current) {
      setIsDrawing(true);
      const canvas = signatureCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.beginPath();
        
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          // For touch events
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          // For mouse events
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        // Scale coordinates to match canvas size
        x = (x / rect.width) * canvas.width;
        y = (y / rect.height) * canvas.height;
        
        context.moveTo(x, y);
      }
    }
  };
  
  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior to stop scrolling on touch devices
    e.preventDefault();
    
    if (isDrawing && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          // For touch events
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          // For mouse events
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        // Scale coordinates to match canvas size
        x = (x / rect.width) * canvas.width;
        y = (y / rect.height) * canvas.height;
        
        context.lineTo(x, y);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.stroke();
        
        // Start a new path to avoid connecting lines when drawing multiple strokes
        context.beginPath();
        context.moveTo(x, y);
      }
    }
  };
  
  const stopSignatureDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior if event is provided
    if (e) e.preventDefault();
    
    if (isDrawing && signatureCanvasRef.current) {
      setIsDrawing(false);
      
      const canvas = signatureCanvasRef.current;
      const signatureDataUrl = canvas.toDataURL('image/png');
      setSignature(signatureDataUrl);
    }
  };
  
  // Clear signature
  const clearSignature = () => {
    if (signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        setSignature(null);
      }
    }
  };
  
  // Clear annotation
  const clearAnnotation = () => {
    if (annotationCanvasRef.current && currentImageIndex !== null) {
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Check if we have the original image stored
        const originalDataUrl = capturedImages[currentImageIndex].originalDataUrl;
        
        if (originalDataUrl) {
          // Restore the original image without annotations
          const updatedImages = [...capturedImages];
          updatedImages[currentImageIndex].dataUrl = originalDataUrl;
          setCapturedImages(updatedImages);
          
          // Load the original image onto the canvas
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = originalDataUrl;
          
          img.onload = () => {
            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Redraw the original image
            const size = Math.min(window.innerWidth - 40, 500);
            context.drawImage(img, 0, 0, size, size);
            
            console.log('🔄 Restored original image without annotations');
          };
        } else {
          // If no original image is stored, just clear the canvas
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Reload the current image
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = capturedImages[currentImageIndex].dataUrl;
          
          img.onload = () => {
            // Redraw the image
            const size = Math.min(window.innerWidth - 40, 500);
            context.drawImage(img, 0, 0, size, size);
          };
        }
      }
    }
  };
  
  // Generate PDF
  const generatePDF = () => {
    if (!userName || !currentDate || !signature) {
      alert('Please fill in all fields and provide a signature before generating the PDF.');
      return;
    }
    
    const pdf = new jsPDF();
    let yPosition = 20;
    
    // Add title
    pdf.setFontSize(20);
    pdf.text('Site Audit Report', 105, yPosition, { align: 'center' });
    yPosition += 15;
    
    // Add user info
    pdf.setFontSize(12);
    pdf.text(`Inspector: ${userName}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Date: ${currentDate}`, 20, yPosition);
    yPosition += 20;
    
    // Add images (which now include annotations)
    capturedImages.forEach((image, index) => {
      // Add page break if needed
      if (yPosition > 230) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Add image title
      pdf.setFontSize(14);
      pdf.text(`${index + 1}. ${image.title}`, 20, yPosition);
      yPosition += 10;
      
      // Add image (which now includes any annotations)
      try {
        pdf.addImage(image.dataUrl, 'PNG', 20, yPosition, 170, 100);
        yPosition += 110; // Adjusted spacing since we don't have separate annotations anymore
      } catch (error) {
        console.error('Error adding image to PDF:', error);
      }
    });
    
    // Add signature on the last page
    pdf.addPage();
    pdf.setFontSize(12);
    pdf.text('Signature:', 20, 20);
    pdf.addImage(signature, 'PNG', 20, 30, 100, 50);
    
    // Save PDF
    pdf.save('site-audit-report.pdf');
    
    // Reset form
    setShowPdfForm(false);
  };
  
  // Select image for annotation
  const selectImageForAnnotation = (index: number) => {
    setCurrentImageIndex(index);
    
    // Store the original image if not already stored
    if (!capturedImages[index].originalDataUrl) {
      const updatedImages = [...capturedImages];
      updatedImages[index].originalDataUrl = capturedImages[index].dataUrl;
      setCapturedImages(updatedImages);
    }
    
    // Use setTimeout to ensure the canvas is available after state update
    setTimeout(() => {
      if (annotationCanvasRef.current && capturedImages[index]) {
        const canvas = annotationCanvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Clear any existing drawings
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Make sure the canvas dimensions match the displayed size
          const canvasRect = canvas.getBoundingClientRect();
          canvas.width = canvasRect.width;
          canvas.height = canvasRect.height;
          
          // Set up the drawing style
          context.strokeStyle = 'red';
          context.lineWidth = 3;
          context.lineCap = 'round';
          
          // If there's an existing annotation, draw it
          if (capturedImages[index].annotation) {
            const img = new window.Image();
            img.onload = () => {
              context.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = capturedImages[index].annotation as string;
          }
        }
      }
    }, 100);
  };
  
  // Delete image
  const deleteImage = (index: number) => {
    const updatedImages = [...capturedImages];
    updatedImages.splice(index, 1);
    setCapturedImages(updatedImages);
    
    if (currentImageIndex === index) {
      setCurrentImageIndex(null);
    } else if (currentImageIndex !== null && currentImageIndex > index) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);
  
  // Set current date on mount
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setCurrentDate(formattedDate);
  }, []);
  
  // Initialize canvases with proper dimensions
  useEffect(() => {
    // Initialize signature canvas
    if (signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match its display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Set up drawing properties
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 2;
      }
    }
    
    // Initialize annotation canvas when an image is selected
    if (annotationCanvasRef.current && currentImageIndex !== null) {
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set up drawing properties
        context.lineJoin = 'round';
        context.lineCap = 'round';
        context.strokeStyle = 'red';
        context.lineWidth = 3;
      }
    }
  }, [currentImageIndex, showPdfForm]);
  
  // Check camera capabilities on mount
  useEffect(() => {
    const checkCameraCapabilities = async () => {
      console.log('🔍 Checking camera capabilities');
      console.log('📱 Browser info:', 
        navigator.userAgent, 
        'isSafari:', /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      );
      
      try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices) {
          console.error('❌ MediaDevices API not supported in this browser');
          return;
        }
        
        console.log('✅ MediaDevices API is supported');
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices.getUserMedia) {
          console.error('❌ getUserMedia not supported in this browser');
          return;
        }
        
        console.log('✅ getUserMedia is supported');
        
        // Check if enumerateDevices is available
        if (!navigator.mediaDevices.enumerateDevices) {
          console.error('❌ enumerateDevices not supported in this browser');
          return;
        }
        
        console.log('✅ enumerateDevices is supported');
        
        // Just check if we can enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('📱 All devices:', devices.length);
        
        // Log all devices
        devices.forEach((device, index) => {
          console.log(`Device ${index + 1}:`, {
            kind: device.kind,
            deviceId: device.deviceId,
            label: device.label || `Device ${index + 1} (no label available)`,
            groupId: device.groupId
          });
        });
        
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('📹 Available video devices:', videoDevices.length);
        
        if (videoDevices.length === 0) {
          console.warn('⚠️ No video devices found');
        }
        
        videoDevices.forEach((device, index) => {
          console.log(`Camera ${index + 1}:`, {
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1} (no label available)`,
            groupId: device.groupId
          });
        });
        
        // Safari specific check - if labels are empty, permissions might not be granted yet
        if (videoDevices.length > 0 && !videoDevices[0].label) {
          console.warn('⚠️ Camera labels are empty. On Safari, this usually means permissions have not been granted yet.');
          console.log('ℹ️ On Safari, camera labels are only available after getUserMedia has been called with permission granted.');
        }
        
        // Check for HTTPS
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          console.warn('⚠️ Not using HTTPS. Camera access may be blocked in some browsers.');
        } else {
          console.log('✅ Using secure context (HTTPS or localhost)');
        }
      } catch (error) {
        console.error('❌ Error checking camera capabilities:', error);
      }
    };
    
    checkCameraCapabilities();
  }, []);
  
  // Safari-specific workaround for camera issues
  useEffect(() => {
    // Check if this is Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isSafari && videoRef.current && stream) {
      console.log('🧩 Applying Safari-specific workarounds');
      
      // Safari sometimes needs a timeout before playing
      const safariWorkaround = () => {
        if (videoRef.current) {
          console.log('🔄 Attempting Safari workaround');
          
          // Sometimes detaching and reattaching the stream helps
          const tracks = stream.getVideoTracks();
          if (tracks.length > 0) {
            console.log('🔌 Temporarily disabling track');
            tracks[0].enabled = false;
            
            setTimeout(() => {
              if (tracks[0]) {
                console.log('🔌 Re-enabling track');
                tracks[0].enabled = true;
                
                // Force a play attempt
                if (videoRef.current && videoRef.current.paused) {
                  console.log('▶️ Forcing play in Safari workaround');
                  videoRef.current.play()
                    .then(() => console.log('✅ Safari workaround play successful'))
                    .catch(e => console.error('❌ Safari workaround play failed:', e));
                }
              }
            }, 500);
          }
          
          // Try setting srcObject again
          setTimeout(() => {
            if (videoRef.current && stream) {
              console.log('🔄 Re-setting srcObject in Safari');
              videoRef.current.srcObject = null;
              setTimeout(() => {
                if (videoRef.current && stream) {
                  videoRef.current.srcObject = stream;
                  videoRef.current.play()
                    .then(() => console.log('✅ Safari re-setting srcObject successful'))
                    .catch(e => console.error('❌ Safari re-setting srcObject failed:', e));
                }
              }, 100);
            }
          }, 1000);
        }
      };
      
      // Apply the workaround after a short delay
      setTimeout(safariWorkaround, 1000);
    }
  }, [stream]);
  
  // Start a new report - reset all fields and clear all images
  const startNewReport = () => {
    // Confirm with the user before clearing everything
    if (capturedImages.length > 0 && !window.confirm('Are you sure you want to start a new report? This will clear all images and data.')) {
      return;
    }
    
    // Stop the camera if it's running
    if (stream) {
      stopCamera();
    }
    
    // Reset all state
    setCapturedImages([]);
    setCurrentImageIndex(null);
    
    // Clear signature if it exists
    if (signatureCanvasRef.current) {
      const context = signatureCanvasRef.current.getContext('2d');
      if (context) {
        context.clearRect(0, 0, signatureCanvasRef.current.width, signatureCanvasRef.current.height);
      }
    }
    setSignature(null);
    
    // Reset PDF form
    setShowPdfForm(false);
    
    // Clear localStorage
    localStorage.removeItem('siteaudit_captured_images');
    localStorage.removeItem('siteaudit_signature');
    
    // Clear IndexedDB data
    if (dbInitialized) {
      try {
        saveToIndexedDB('settings', { key: 'capturedImages', data: [] });
        saveToIndexedDB('settings', { key: 'signature', data: null });
        console.log('🗑️ Cleared IndexedDB data');
      } catch (error) {
        console.error('Error clearing IndexedDB data:', error);
      }
    }
    
    // Set report as started and start camera
    setReportStarted(true);
    startCamera();
    
    console.log('🔄 Started new report - all data cleared');
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Site Audit Tool</h1>
      
      {showOfflineNotice && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                This tool works offline! Your images and data are saved locally. You can add this app to your home screen for easy access.
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setShowOfflineNotice(false)}
                  className="inline-flex bg-blue-50 rounded-md p-1.5 text-blue-500 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!showPdfForm ? (
        <div>
          {reportStarted && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Step 1: Capture Images</h2>
              
              {!stream ? (
                <div>
                  <button
                    onClick={startCamera}
                    disabled={isLoadingCamera}
                    className={`bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors ${isLoadingCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoadingCamera ? 'Starting Camera...' : (wasStreamActive ? 'Allow Camera Access' : 'Allow Camera Access')}
                  </button>
                  
                  {isLoadingCamera && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                      <p className="text-gray-600">Initializing camera, please wait...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative mx-auto w-full max-w-[500px] aspect-square">
                    {isLoadingCamera && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10 rounded">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto"></div>
                          <p className="text-white mt-2">Loading camera...</p>
                        </div>
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover rounded bg-black"
                      style={{ display: 'block' }}
                      onLoadedMetadata={() => console.log('🎬 onLoadedMetadata event fired')}
                      onLoadedData={() => console.log('📼 onLoadedData event fired')}
                      onPlay={() => console.log('▶️ onPlay event fired')}
                      onPlaying={() => console.log('🎭 onPlaying event fired')}
                      onError={(e) => console.error('❌ onError event fired', e)}
                      onCanPlay={() => console.log('✅ onCanPlay event fired')}
                      onCanPlayThrough={() => console.log('✅✅ onCanPlayThrough event fired')}
                      onStalled={() => console.log('⚠️ onStalled event fired')}
                      onSuspend={() => console.log('⏸️ onSuspend event fired')}
                      onWaiting={() => console.log('⏳ onWaiting event fired')}
                      onEmptied={() => console.log('🗑️ onEmptied event fired')}
                      onAbort={() => console.log('🛑 onAbort event fired')}
                    ></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    {/* Capture button overlay */}
                    <button
                      onClick={captureImage}
                      disabled={isLoadingCamera}
                      className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white py-3 px-6 rounded-full hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center ${isLoadingCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Capture
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Only show the image grid if there are captured images AND no image is currently being edited */}
          {capturedImages.length > 0 && currentImageIndex === null && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Step 2: Review & Annotate Images</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {capturedImages.map((image, index) => (
                  <div key={index} className="border rounded p-4">
                    <h3 className="font-medium mb-2">{image.title}</h3>
                    <div 
                      className="relative w-full aspect-square mb-2 cursor-pointer"
                      onClick={() => selectImageForAnnotation(index)}
                    >
                      <Image
                        src={image.dataUrl}
                        alt={image.title}
                        fill
                        className="object-cover rounded"
                        unoptimized // Required for data URLs
                      />
                    </div>
                    <div className="flex justify-between">
                      <button
                        onClick={() => selectImageForAnnotation(index)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {image.annotation ? 'Edit Annotation' : 'Add Annotation'}
                      </button>
                      <button
                        onClick={() => deleteImage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setShowPdfForm(true)}
                  className="bg-green-600 text-white py-2 px-6 rounded hover:bg-green-700 transition-colors"
                >
                  Generate PDF Report
                </button>
              </div>
            </div>
          )}
          
          {/* Annotation UI */}
          {currentImageIndex !== null && (
            <div className="border rounded p-4 mb-6">
              <h3 className="text-xl font-semibold mb-4">
                Annotate and Save
              </h3>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-1">Rename Image</label>
                <input
                  id="image-title-input"
                  type="text"
                  value={capturedImages[currentImageIndex].title}
                  onChange={(e) => {
                    const updatedImages = [...capturedImages];
                    updatedImages[currentImageIndex].title = e.target.value;
                    setCapturedImages(updatedImages);
                  }}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Enter a descriptive title for this image"
                />
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                Draw a red line on the image to highlight areas of concern.
              </p>
              <div className="relative mx-auto w-full max-w-[500px] aspect-square">
                <Image
                  src={capturedImages[currentImageIndex].dataUrl}
                  alt={capturedImages[currentImageIndex].title}
                  fill
                  className="object-cover rounded absolute"
                  unoptimized // Required for data URLs
                />
                <canvas
                  ref={annotationCanvasRef}
                  className="w-full h-full rounded absolute top-0 left-0"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  onTouchCancel={stopDrawing}
                ></canvas>
              </div>
              <div className="flex justify-end mt-2">
                <button
                  onClick={clearAnnotation}
                  className="bg-gray-600 text-white py-1 px-3 rounded hover:bg-gray-700 transition-colors mr-2"
                >
                  Clear Annotation
                </button>
                <button
                  onClick={() => setCurrentImageIndex(null)}
                  className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          
          {(!reportStarted || capturedImages.length > 0) && (
            <div className="mt-12 text-center">
              <button
                onClick={startNewReport}
                className="bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center justify-center shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                {capturedImages.length > 0 ? 'Start New Report' : 'Start Report'}
              </button>
            </div>
          )}
        </div>
        
      ) : (
        <div className="max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Step 3: Complete Report Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 mb-1">Signature</label>
              <div className="border rounded p-2 bg-white">
                <p className="text-xs text-gray-500 mb-1">Sign below:</p>
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={150}
                  className="border w-full rounded"
                  style={{ touchAction: 'none' }}
                  onMouseDown={startSignatureDrawing}
                  onMouseMove={drawSignature}
                  onMouseUp={stopSignatureDrawing}
                  onMouseLeave={stopSignatureDrawing}
                  onTouchStart={startSignatureDrawing}
                  onTouchMove={drawSignature}
                  onTouchEnd={stopSignatureDrawing}
                  onTouchCancel={stopSignatureDrawing}
                ></canvas>
              </div>
              <button
                onClick={clearSignature}
                className="text-sm text-blue-600 mt-1"
              >
                Clear Signature
              </button>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowPdfForm(false)}
                className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={generatePDF}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors flex-grow"
              >
                Generate & Download PDF
              </button>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <button
              onClick={startNewReport}
              className="bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center justify-center shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Start New Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 