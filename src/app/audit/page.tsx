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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize camera
  const startCamera = async () => {
    try {
      // Set specific constraints for better compatibility
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 640, ideal: 1280, max: 1920 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.style.transform = 'scaleX(-1)'; // Mirror the video for front camera
        
        // Wait for video to be loaded before playing
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => {
              console.error('Error playing video:', e);
            });
          }
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Error accessing camera. Please make sure you have granted camera permissions.');
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Site Audit Tool</h1>
      
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
                <div className="relative mx-auto w-full max-w-[500px] aspect-square overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
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