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

export default function AuditPage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [currentTitle, setCurrentTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [showOfflineNotice, setShowOfflineNotice] = useState(true);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [wasStreamActive, setWasStreamActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationSectionRef = useRef<HTMLDivElement>(null);
  
  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      const savedImages = localStorage.getItem('siteaudit_captured_images');
      const savedUserName = localStorage.getItem('siteaudit_user_name');
      const savedSignature = localStorage.getItem('siteaudit_signature');
      
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
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);
  
  // Save captured images to localStorage whenever they change
  useEffect(() => {
    try {
      if (capturedImages.length > 0) {
        localStorage.setItem('siteaudit_captured_images', JSON.stringify(capturedImages));
        console.log('💾 Saved images to localStorage');
      }
    } catch (error) {
      console.error('Error saving images to localStorage:', error);
    }
  }, [capturedImages]);
  
  // Save user name to localStorage whenever it changes
  useEffect(() => {
    if (userName) {
      localStorage.setItem('siteaudit_user_name', userName);
      console.log('💾 Saved user name to localStorage');
    }
  }, [userName]);
  
  // Save signature to localStorage whenever it changes
  useEffect(() => {
    if (signature) {
      localStorage.setItem('siteaudit_signature', signature);
      console.log('💾 Saved signature to localStorage');
    }
  }, [signature]);
  
  // Initialize camera
  const startCamera = async () => {
    console.log('🔍 startCamera function called');
    setIsLoadingCamera(true);
    
    // Check if we're in the PDF form view or if videoRef is not available
    if (showPdfForm || !videoRef.current) {
      console.log('⚠️ Cannot start camera: ' + 
        (showPdfForm ? 'In PDF form view' : 'Video element not available'));
      setIsLoadingCamera(false);
      return;
    }
    
    try {
      // Set wasStreamActive to true since we're explicitly starting the camera
      setWasStreamActive(true);
      
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
      
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Camera stream obtained successfully');
        
        // Log track information
        const videoTracks = mediaStream.getVideoTracks();
        console.log('📹 Video tracks:', videoTracks.length);
        videoTracks.forEach((track, index) => {
          console.log(`Track ${index + 1}:`, track.label, 'Enabled:', track.enabled, 'Settings:', track.getSettings());
        });
        
        setStream(mediaStream);
        
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
                })
                .catch(error => {
                  console.error('❌ Error starting video playback:', error);
                  alert('Failed to start video playback. Please check your camera permissions and try again.');
                  stopCamera();
                });
            }
          });
        } else {
          console.error('❌ videoRef.current is null after getting stream');
          alert('Video element not available. Please try refreshing the page.');
          stopCamera();
        }
      } catch (mediaError) {
        console.error('❌ Error getting media stream:', mediaError);
        alert('Failed to access camera. Please check your camera permissions and try again.');
        stopCamera();
      }
    } catch (error) {
      console.error('❌ Unexpected error in startCamera:', error);
      alert('An unexpected error occurred. Please try refreshing the page.');
      setIsLoadingCamera(false);
    }
  };
  
  // Stop camera - wrapped in useCallback to prevent dependency changes
  const stopCamera = useCallback(() => {
    console.log('🛑 stopCamera function called');
    if (stream) {
      console.log('🛑 Stopping all tracks in stream');
      stream.getTracks().forEach(track => {
        console.log(`🛑 Stopping track: ${track.label}`);
        track.stop();
      });
      setStream(null);
    } else {
      console.log('⚠️ No stream to stop');
    }
    setIsLoadingCamera(false);
  }, [stream]);
  
  // Handle page visibility changes to refresh camera when returning to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      // This handler will only handle automatic camera restart
      // without prompting the user, and only when not in PDF form view
      if (document.visibilityState === 'visible' && !showPdfForm) {
        console.log('📱 Page is now visible');
        
        // If stream was active before but is now stopped or null, restart it
        if (wasStreamActive && (!stream || stream.getVideoTracks().some(track => !track.enabled || track.readyState !== 'live'))) {
          // Check if this is a real visibility change (tab/app switch) rather than navigation
          const lastHiddenTime = parseInt(sessionStorage.getItem('lastPageHiddenTime') || '0');
          const currentTime = Date.now();
          const timeSinceHidden = currentTime - lastHiddenTime;
          
          // Only auto-restart if the page was hidden for a short time (less than 1 second)
          // This helps with brief interruptions but avoids conflicts with the user prompt
          if (timeSinceHidden < 1000) {
            console.log('🔄 Auto-restarting camera after brief page visibility change');
            
            // Stop any existing stream first
            if (stream) {
              stopCamera();
            }
            
            // Short delay before restarting
            setTimeout(() => {
              // Only restart if we're still in the same state
              if (document.visibilityState === 'visible' && !showPdfForm) {
                startCamera();
              }
            }, 300);
          }
        }
      } else if (document.visibilityState === 'hidden') {
        console.log('📱 Page is now hidden');
        
        // Remember if stream was active
        if (stream) {
          setWasStreamActive(true);
          // Store the timestamp when the page was hidden
          sessionStorage.setItem('lastPageHiddenTime', Date.now().toString());
        }
      }
    };
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stream, wasStreamActive, stopCamera, startCamera, showPdfForm, isLoadingCamera]);
  
  // Capture image
  const captureImage = () => {
    if (videoRef.current && canvasRef.current && currentTitle) {
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
        
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImages([...capturedImages, { dataUrl, title: currentTitle, annotation: null }]);
        setCurrentTitle('');
      }
    } else {
      alert('Please enter a title for the image before capturing.');
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
  
  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default behavior if event is provided
    if (e) e.preventDefault();
    
    if (isDrawing && annotationCanvasRef.current && currentImageIndex !== null) {
      setIsDrawing(false);
      
      const canvas = annotationCanvasRef.current;
      // Save the combined image+annotation as the new image
      const combinedImageDataUrl = canvas.toDataURL('image/png');
      
      // Update the captured image with the combined image+annotation
      const updatedImages = [...capturedImages];
      // Store the combined result as the main image
      updatedImages[currentImageIndex].dataUrl = combinedImageDataUrl;
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
      // Load the image onto the annotation canvas
      if (annotationCanvasRef.current) {
        const canvas = annotationCanvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Clear the canvas first
          const size = Math.min(window.innerWidth - 40, 500);
          canvas.width = size;
          canvas.height = size;
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // Load and draw the original image
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          
          // Use the original image if available, otherwise use the current image
          const imageSource = capturedImages[index].originalDataUrl || capturedImages[index].dataUrl;
          console.log('🖼️ Loading image for annotation from source:', imageSource.substring(0, 50) + '...');
          img.src = imageSource;
          
          img.onload = () => {
            // Draw the image maintaining aspect ratio
            context.drawImage(img, 0, 0, size, size);
            
            // Set up drawing properties
            context.lineJoin = 'round';
            context.lineCap = 'round';
            context.strokeStyle = 'red';
            context.lineWidth = 3;
            
            console.log('✅ Image loaded for annotation:', {
              width: img.width,
              height: img.height,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height
            });
            
            // Scroll to the annotation section
            if (annotationSectionRef.current) {
              annotationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              console.log('📜 Scrolled to annotation section');
            }
          };
          
          // Handle image loading errors
          img.onerror = (error) => {
            console.error('❌ Error loading image for annotation:', error);
            alert('Error loading image for annotation. Please try again.');
          };
        }
      } else {
        console.error('❌ Annotation canvas not available');
      }
    }, 50); // Short delay to ensure canvas is ready
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
    setCurrentTitle('');
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
    
    console.log('🔄 Started new report - all data cleared');
  };
  
  // Effect to handle returning from PDF form (signature view)
  useEffect(() => {
    // If we're returning from the PDF form to the main view
    if (!showPdfForm && wasStreamActive) {
      console.log('🔄 Returning to main view - resetting camera');
      
      // Always stop any existing stream first
      if (stream) {
        stopCamera();
      }
      
      // Show a prompt to the user
      const shouldRestart = window.confirm('Would you like to restart the camera?');
      
      if (shouldRestart) {
        // Short delay before restarting
        setTimeout(() => {
          startCamera();
        }, 100);
      }
    }
    
    // When going to PDF form, remember if stream was active
    if (showPdfForm && stream) {
      console.log('📝 Going to signature view, remembering camera was active');
      setWasStreamActive(true);
    }
  }, [showPdfForm, wasStreamActive, stream, stopCamera, startCamera]);
  
  // Also handle page visibility changes (tab switching, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only prompt to restart camera if we're not in the PDF form view
      // and the page became visible from being hidden (not from navigation)
      if (document.visibilityState === 'visible' && wasStreamActive && !showPdfForm) {
        // Check if this is a real visibility change (tab/app switch) rather than navigation
        // We'll use a timestamp to track when the page was hidden
        const lastHiddenTime = parseInt(sessionStorage.getItem('lastPageHiddenTime') || '0');
        const currentTime = Date.now();
        const timeSinceHidden = currentTime - lastHiddenTime;
        
        // Only prompt if the page was hidden for more than 1 second
        // This helps avoid false triggers during navigation
        if (timeSinceHidden > 1000) {
          console.log('📱 Page is now visible - prompting to restart camera');
          
          // Stop any existing stream
          if (stream) {
            stopCamera();
          }
          
          // Only prompt if we're not already loading the camera
          if (!isLoadingCamera) {
            // Prompt user to restart camera
            const shouldRestart = window.confirm('Would you like to restart the camera?');
            
            if (shouldRestart) {
              setTimeout(() => {
                // Only restart if we're still in the same state
                if (document.visibilityState === 'visible' && !showPdfForm && !isLoadingCamera) {
                  startCamera();
                }
              }, 300);
            } else {
              // If user declines, reset wasStreamActive
              setWasStreamActive(false);
            }
          }
        }
      } else if (document.visibilityState === 'hidden') {
        // Store the timestamp when the page was hidden
        sessionStorage.setItem('lastPageHiddenTime', Date.now().toString());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stream, wasStreamActive, stopCamera, startCamera, showPdfForm, isLoadingCamera]);
  
  // Add an effect to handle camera state when showing PDF form
  useEffect(() => {
    // When showing PDF form, stop the camera
    if (showPdfForm && stream) {
      console.log('📝 Showing PDF form, stopping camera');
      stopCamera();
      // Don't set wasStreamActive here, as we don't want to prompt to restart
      // when returning from the PDF form
    }
  }, [showPdfForm, stream, stopCamera]);
  
  // Reset camera state on component mount
  useEffect(() => {
    console.log('🔄 Component mounted, resetting camera state');
    // Reset camera-related state on component mount
    setWasStreamActive(false);
    setIsLoadingCamera(false);
    
    // Clean up on unmount
    return () => {
      if (stream) {
        console.log('🧹 Cleaning up camera on component unmount');
        stopCamera();
      }
    };
  }, [stopCamera, stream]);
  
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
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Step 1: Capture Images</h2>
            
            {!stream ? (
              <div>
                <button
                  onClick={() => {
                    console.log('📸 Start Camera button clicked');
                    // Reset any state that might be preventing camera start
                    setWasStreamActive(false);
                    // Call startCamera with a slight delay to ensure state is updated
                    setTimeout(() => {
                      startCamera();
                    }, 100);
                  }}
                  disabled={isLoadingCamera}
                  className={`bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors ${isLoadingCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoadingCamera ? 'Starting Camera...' : 'Start Camera'}
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
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    placeholder="Enter image title (e.g., Crack on floor in living room)"
                    className="flex-grow border rounded px-3 py-2"
                    disabled={isLoadingCamera}
                  />
                  <button
                    onClick={captureImage}
                    disabled={isLoadingCamera || !currentTitle}
                    className={`bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors ${(isLoadingCamera || !currentTitle) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Capture Image
                  </button>
                  <button
                    onClick={stopCamera}
                    disabled={isLoadingCamera}
                    className={`bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors ${isLoadingCamera ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Stop Camera
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {capturedImages.length > 0 && (
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
              
              {currentImageIndex !== null && (
                <div ref={annotationSectionRef} className="border rounded p-4 mb-6">
                  <h3 className="font-medium mb-2">
                    Annotating: {capturedImages[currentImageIndex].title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Draw a red line on the image to highlight areas of concern.
                  </p>
                  <div className="relative mx-auto w-full max-w-[500px] aspect-square">
                    <canvas
                      ref={annotationCanvasRef}
                      className="border w-full h-full bg-white rounded"
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
                      Done
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    // Reset wasStreamActive to prevent camera restart prompt
                    setWasStreamActive(false);
                    setShowPdfForm(false);
                  }}
                  className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                
                <button
                  onClick={() => {
                    // Stop the camera before showing the PDF form
                    if (stream) {
                      stopCamera();
                    }
                    // Reset wasStreamActive to prevent camera restart prompt
                    setWasStreamActive(false);
                    setShowPdfForm(true);
                  }}
                  className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition-colors ml-4"
                >
                  Generate PDF Report
                </button>
              </div>
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
                onClick={() => {
                  // Reset wasStreamActive to prevent camera restart prompt
                  setWasStreamActive(false);
                  setShowPdfForm(false);
                }}
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
          
          {capturedImages.length > 0 && (
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
          )}
        </div>
      )}
    </div>
  );
} 