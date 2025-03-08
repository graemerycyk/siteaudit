'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Loading component for Suspense fallback
function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="max-w-md mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        <p className="text-gray-600">Please wait while we process your request...</p>
      </div>
    </div>
  );
}

// Main success page content
function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setIsLoading(false);
        return;
      }
      
      try {
        // Verify the payment with the server
        const response = await fetch(`/api/verify-payment?session_id=${sessionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }
        
        // Payment verified successfully
        setIsLoading(false);
      } catch (error) {
        console.error('Error verifying payment:', error);
        setError('Failed to verify payment. Please contact support.');
        setIsLoading(false);
      }
    };
    
    verifyPayment();
  }, [sessionId]);
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Processing Your Payment</h1>
          <p className="text-gray-600">Please wait while we verify your payment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            <h2 className="font-bold">Error</h2>
            <p>{error}</p>
          </div>
          <Link 
            href="/advertise" 
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-green-100 text-green-800 p-8 rounded-lg mb-8">
          <svg 
            className="h-16 w-16 text-green-600 mx-auto mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
          <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
          <p className="text-lg mb-2">
            Thank you for your advertisement submission.
          </p>
          <p className="text-gray-700">
            Your advertisement has been received and will be reviewed by our team.
            Once approved, it will be displayed on our website.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
          <ol className="text-left space-y-3">
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">1</span>
              <span>Our team will review your advertisement within 24-48 hours.</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">2</span>
              <span>You&apos;ll receive an email notification once your ad is approved.</span>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0">3</span>
              <span>Your advertisement will be displayed on our website for the duration you selected.</span>
            </li>
          </ol>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
          <Link 
            href="/advertise" 
            className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Submit Another Ad
          </Link>
        </div>
      </div>
    </div>
  );
}

// Export the main page component with Suspense
export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SuccessPageContent />
    </Suspense>
  );
} 