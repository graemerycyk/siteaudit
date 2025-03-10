'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import Image from 'next/image';

interface CapturedImage {
  dataUrl: string;
  title: string;
  annotation: string | null;
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
  const [useDirectCapture, setUseDirectCapture] = useState(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
              })
              .catch(e => {
                console.error('❌ Error playing video:', e);
                alert('Error playing video. Please check console for details.');
              });
          }
        });
        
        // Add error event listener
        videoRef.current.addEventListener('error', (e) => {
          console.error('❌ Video element error:', e);
        });
      } else {
        console.error('❌ videoRef.current is null');
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
                })
                .catch(e => {
                  console.error('❌ Error playing fallback video:', e);
                  alert('Error playing video. Please check console for details.');
                });
            }
          });
          
          // Add error event listener
          videoRef.current.addEventListener('error', (e) => {
            console.error('❌ Fallback video element error:', e);
          });
        } else {
          console.error('❌ videoRef.current is null for fallback');
        }
      } catch (fallbackError) {
        console.error('❌ Error accessing any camera:', fallbackError);
        alert('Error accessing camera. Please make sure you have granted camera permissions.');
      }
    }
  };
  
  // Stop camera - wrapped in useCallback to prevent dependency changes
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);
  
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
    if (annotationCanvasRef.current && currentImageIndex !== null) {
      setIsDrawing(true);
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.beginPath();
        
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        context.moveTo(x, y);
      }
    }
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawing && annotationCanvasRef.current) {
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        context.lineTo(x, y);
        context.strokeStyle = 'red';
        context.lineWidth = 3;
        context.stroke();
      }
    }
  };
  
  const stopDrawing = () => {
    if (isDrawing && annotationCanvasRef.current && currentImageIndex !== null) {
      setIsDrawing(false);
      
      const canvas = annotationCanvasRef.current;
      const annotationDataUrl = canvas.toDataURL('image/png');
      
      // Update the captured image with the annotation
      const updatedImages = [...capturedImages];
      updatedImages[currentImageIndex].annotation = annotationDataUrl;
      setCapturedImages(updatedImages);
    }
  };
  
  // Handle signature drawing
  const startSignatureDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (signatureCanvasRef.current) {
      setIsDrawing(true);
      const canvas = signatureCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.beginPath();
        
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        context.moveTo(x, y);
      }
    }
  };
  
  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawing && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if ('touches' in e) {
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        
        context.lineTo(x, y);
        context.strokeStyle = 'black';
        context.lineWidth = 2;
        context.stroke();
      }
    }
  };
  
  const stopSignatureDrawing = () => {
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
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update the captured image with null annotation
        const updatedImages = [...capturedImages];
        updatedImages[currentImageIndex].annotation = null;
        setCapturedImages(updatedImages);
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
    
    // Add images and annotations
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
      
      // Add image
      try {
        pdf.addImage(image.dataUrl, 'PNG', 20, yPosition, 170, 100);
        yPosition += 105;
        
        // Add annotation if exists
        if (image.annotation) {
          pdf.addImage(image.annotation, 'PNG', 20, yPosition, 170, 100);
          yPosition += 110;
        } else {
          yPosition += 10;
        }
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
    
    // Load the image onto the annotation canvas
    if (annotationCanvasRef.current) {
      const canvas = annotationCanvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        const img = new window.Image();
        img.onload = () => {
          // Make sure the canvas is square
          const size = Math.min(canvas.clientWidth, canvas.clientHeight);
          canvas.width = size;
          canvas.height = size;
          
          // Draw the image maintaining aspect ratio
          context.drawImage(img, 0, 0, size, size);
          
          // If there's an existing annotation, draw it
          if (capturedImages[index].annotation) {
            const annotationImg = new window.Image();
            annotationImg.onload = () => {
              context.drawImage(annotationImg, 0, 0, size, size);
            };
            annotationImg.src = capturedImages[index].annotation as string;
          }
        };
        img.src = capturedImages[index].dataUrl;
      }
    }
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
              <button
                onClick={startCamera}
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Start Camera
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative mx-auto w-full max-w-[500px] aspect-square">
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
                  />
                  <button
                    onClick={captureImage}
                    className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                  >
                    Capture Image
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
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
                <div className="border rounded p-4 mb-6">
                  <h3 className="font-medium mb-2">
                    Annotating: {capturedImages[currentImageIndex].title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Draw a red line on the image to highlight areas of concern.
                  </p>
                  <div className="relative mx-auto w-full max-w-[500px] aspect-square">
                    <canvas
                      ref={annotationCanvasRef}
                      className="border w-full h-full bg-white"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
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
              
              <button
                onClick={() => setShowPdfForm(true)}
                className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition-colors"
              >
                Generate PDF Report
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
                <canvas
                  ref={signatureCanvasRef}
                  width={400}
                  height={150}
                  className="border w-full"
                  onMouseDown={startSignatureDrawing}
                  onMouseMove={drawSignature}
                  onMouseUp={stopSignatureDrawing}
                  onMouseLeave={stopSignatureDrawing}
                  onTouchStart={startSignatureDrawing}
                  onTouchMove={drawSignature}
                  onTouchEnd={stopSignatureDrawing}
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
        </div>
      )}
    </div>
  );
} 