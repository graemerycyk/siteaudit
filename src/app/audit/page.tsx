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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize camera with more robust error handling and device-specific fixes
  const startCamera = async () => {
    setCameraError(null);
    setDebugInfo([`Starting camera at ${new Date().toISOString()}`]);
    
    try {
      // First, stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setDebugInfo(prev => [...prev, 'Stopped existing stream']);
      }
      
      // Check if running on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
      setDebugInfo(prev => [...prev, `Detected iOS device: ${isIOS}`]);
      
      // Try different constraints to maximize compatibility
      const constraints = {
        audio: false,
        video: isIOS 
          ? { facingMode: 'environment' } // Simpler constraints for iOS
          : {
              width: { ideal: 500 },
              height: { ideal: 500 },
              facingMode: 'environment',
              aspectRatio: { ideal: 1 }
            }
      };
      
      console.log('Requesting camera access with constraints:', constraints);
      setDebugInfo(prev => [...prev, `Requesting camera with constraints: ${JSON.stringify(constraints)}`]);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera access granted, tracks:', mediaStream.getVideoTracks());
      
      const videoTracks = mediaStream.getVideoTracks();
      setDebugInfo(prev => [...prev, `Got ${videoTracks.length} video tracks`]);
      
      if (videoTracks.length > 0) {
        const settings = videoTracks[0].getSettings();
        setDebugInfo(prev => [...prev, `Track settings: ${JSON.stringify(settings)}`]);
      }
      
      // Check if we actually got video tracks
      if (mediaStream.getVideoTracks().length === 0) {
        throw new Error('No video tracks available in the media stream');
      }
      
      setStream(mediaStream);
      setDebugInfo(prev => [...prev, 'Stream set successfully']);
      
      if (videoRef.current) {
        // Set srcObject
        videoRef.current.srcObject = mediaStream;
        setDebugInfo(prev => [...prev, 'Set srcObject on video element']);
        
        // Force play on iOS Safari
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Video playback started successfully');
              setIsVideoPlaying(true);
              setDebugInfo(prev => [...prev, 'Video playback started successfully']);
            })
            .catch(error => {
              console.error('Error playing video:', error);
              // On iOS, autoplay might be blocked, so we'll show a play button
              setIsVideoPlaying(false);
              setDebugInfo(prev => [...prev, `Error playing video: ${error.message || 'Unknown error'}`]);
            });
        }
      } else {
        console.error('Video element reference is null');
        setCameraError('Video element not found. Please refresh the page and try again.');
        setDebugInfo(prev => [...prev, 'Video element reference is null']);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Error accessing camera. Please make sure you have granted camera permissions.';
      
      if (error instanceof Error) {
        setDebugInfo(prev => [...prev, `Camera error: ${error.name} - ${error.message}`]);
        
        // Provide more specific error messages
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on your device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not satisfied. Trying with different settings...';
          setDebugInfo(prev => [...prev, 'Trying with simpler constraints']);
          
          // Try again with simpler constraints
          try {
            const simpleStream = await navigator.mediaDevices.getUserMedia({ 
              video: true 
            });
            setStream(simpleStream);
            setDebugInfo(prev => [...prev, 'Got stream with simple constraints']);
            
            if (videoRef.current) {
              videoRef.current.srcObject = simpleStream;
              videoRef.current.play()
                .then(() => {
                  setIsVideoPlaying(true);
                  setDebugInfo(prev => [...prev, 'Video playing with simple constraints']);
                })
                .catch(e => {
                  console.error('Error playing video with simple constraints:', e);
                  setDebugInfo(prev => [...prev, `Error playing with simple constraints: ${e.message}`]);
                });
            }
            return; // Exit if successful
          } catch (simpleError) {
            console.error('Error with simple constraints:', simpleError);
            errorMessage = 'Could not access camera with any settings. Please check your device.';
            if (simpleError instanceof Error) {
              setDebugInfo(prev => [...prev, `Simple constraints error: ${simpleError.name} - ${simpleError.message}`]);
            }
          }
        }
      }
      
      setCameraError(errorMessage);
    }
  };
  
  // Manual play function for iOS Safari
  const playVideo = () => {
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play()
        .then(() => {
          console.log('Video started playing after manual interaction');
          setIsVideoPlaying(true);
        })
        .catch(error => {
          console.error('Error playing video after manual interaction:', error);
          setCameraError('Could not play video after manual interaction. Please try again.');
        });
    }
  };
  
  // Stop camera - wrapped in useCallback to prevent dependency changes
  const stopCamera = useCallback(() => {
    if (stream) {
      console.log('Stopping camera stream');
      stream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}, enabled: ${track.enabled}`);
        track.stop();
      });
      setStream(null);
      setIsVideoPlaying(false);
      
      // Clear srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);
  
  // Add event listeners for visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && stream) {
        // Page is hidden, stop the camera to save resources
        stopCamera();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stream, stopCamera]);
  
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
        
        // Check if we need to handle portrait orientation
        const isPortrait = video.videoHeight > video.videoWidth;
        setDebugInfo(prev => [...prev, `Video orientation: ${isPortrait ? 'portrait' : 'landscape'}`]);
        setDebugInfo(prev => [...prev, `Video dimensions: ${video.videoWidth}x${video.videoHeight}`]);
        
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
  
  // Check device capabilities
  const checkDeviceCapabilities = async () => {
    setDebugInfo(['Checking device capabilities...']);
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDebugInfo(prev => [...prev, 'getUserMedia is not supported in this browser']);
        return;
      }
      
      // Get list of devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      setDebugInfo(prev => [
        ...prev, 
        `Found ${videoDevices.length} video input devices`,
        ...videoDevices.map((device, index) => `Camera ${index + 1}: ${device.label || 'Label not available'}`)
      ]);
      
      // Check browser and OS
      const userAgent = navigator.userAgent;
      setDebugInfo(prev => [...prev, `User Agent: ${userAgent}`]);
      
      // Check if running on iOS
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !('MSStream' in window);
      setDebugInfo(prev => [...prev, `Running on iOS: ${isIOS}`]);
      
      // Check if Safari
      const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
      setDebugInfo(prev => [...prev, `Using Safari: ${isSafari}`]);
      
    } catch (error) {
      console.error('Error checking device capabilities:', error);
      if (error instanceof Error) {
        setDebugInfo(prev => [...prev, `Error checking capabilities: ${error.message}`]);
      }
    }
  };
  
  // Add a button to check device capabilities
  useEffect(() => {
    if (debugMode) {
      checkDeviceCapabilities();
    }
  }, [debugMode]);
  
  // Try a different approach for camera initialization
  const tryAlternativeCamera = async () => {
    setCameraError(null);
    setDebugInfo(prev => [...prev, 'Trying alternative camera approach...']);
    
    try {
      // First, stop any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Create a video element programmatically
      const tempVideo = document.createElement('video');
      tempVideo.setAttribute('autoplay', '');
      tempVideo.setAttribute('muted', '');
      tempVideo.setAttribute('playsinline', '');
      
      // Try with minimal constraints
      const simpleStream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      setDebugInfo(prev => [...prev, 'Got stream with alternative approach']);
      
      // Set the stream on the video element
      tempVideo.srcObject = simpleStream;
      
      // Wait for metadata to load
      tempVideo.onloadedmetadata = () => {
        setDebugInfo(prev => [...prev, 'Video metadata loaded']);
        
        // Try to play the video
        tempVideo.play()
          .then(() => {
            setDebugInfo(prev => [...prev, 'Alternative video playing']);
            
            // If successful, set the stream on our actual video element
            if (videoRef.current) {
              videoRef.current.srcObject = simpleStream;
              videoRef.current.play()
                .then(() => {
                  setIsVideoPlaying(true);
                  setStream(simpleStream);
                  setDebugInfo(prev => [...prev, 'Successfully switched to main video element']);
                })
                .catch(e => {
                  setDebugInfo(prev => [...prev, `Error switching to main video: ${e.message}`]);
                });
            }
          })
          .catch(e => {
            setDebugInfo(prev => [...prev, `Error playing alternative video: ${e.message}`]);
            setCameraError('Could not initialize camera with alternative approach.');
          });
      };
      
      tempVideo.onerror = () => {
        setDebugInfo(prev => [...prev, 'Error loading video metadata']);
        setCameraError('Error loading video metadata with alternative approach.');
      };
      
    } catch (error) {
      console.error('Error with alternative camera approach:', error);
      if (error instanceof Error) {
        setDebugInfo(prev => [...prev, `Alternative camera error: ${error.name} - ${error.message}`]);
      }
      setCameraError('Could not initialize camera with alternative approach.');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Site Audit Tool</h1>
      
      {!showPdfForm ? (
        <div>
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Step 1: Capture Images</h2>
            
            {!stream ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={startCamera}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Start Camera
                </button>
                
                {cameraError && (
                  <>
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-2 max-w-md">
                      <strong className="font-bold">Error: </strong>
                      <span className="block sm:inline">{cameraError}</span>
                    </div>
                    
                    <button
                      onClick={tryAlternativeCamera}
                      className="bg-yellow-600 text-white py-2 px-4 rounded hover:bg-yellow-700 transition-colors mt-2"
                    >
                      Try Alternative Approach
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                >
                  {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative mx-auto w-full max-w-[500px] aspect-square">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover bg-black border rounded"
                    style={{ 
                      objectFit: 'cover',
                      transform: 'scaleX(1)' // Fix mirroring issues on some devices
                    }}
                  ></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  
                  {/* Play button for iOS Safari */}
                  {!isVideoPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 cursor-pointer"
                      onClick={playVideo}
                    >
                      <div className="bg-white bg-opacity-80 rounded-full p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="absolute bottom-4 text-white font-bold">Tap to start camera</p>
                    </div>
                  )}
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
                  
                  {/* Debug mode toggle */}
                  <button
                    onClick={() => setDebugMode(!debugMode)}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                  >
                    {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
                  </button>
                </div>
                
                {/* Debug information panel */}
                {debugMode && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg max-h-60 overflow-y-auto text-xs font-mono">
                    <h3 className="font-bold mb-2">Debug Information:</h3>
                    <ul className="space-y-1">
                      {debugInfo.map((info, index) => (
                        <li key={index} className="border-b border-gray-200 pb-1">{info}</li>
                      ))}
                    </ul>
                  </div>
                )}
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