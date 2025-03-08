'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Advertisement {
  id: string;
  company_name: string;
  website_url: string;
  image_url: string;
}

export default function AdBanner() {
  const [activeAds, setActiveAds] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  
  // Fetch active advertisements
  useEffect(() => {
    const fetchActiveAds = async () => {
      try {
        setIsLoading(true);
        
        // Check if Supabase client is available
        if (!supabase) {
          console.error('Supabase client is not initialized');
          setIsLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('advertisements')
          .select('id, company_name, website_url, image_url')
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setActiveAds(data as Advertisement[]);
        
        // Show banner if there are active ads
        if (data && data.length > 0) {
          setShowBanner(true);
        }
      } catch (error) {
        console.error('Error fetching active advertisements:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchActiveAds();
    
    // Rotate ads every 10 seconds
    const rotationInterval = setInterval(() => {
      setCurrentAdIndex((prevIndex) => {
        if (activeAds.length === 0) return 0;
        return (prevIndex + 1) % activeAds.length;
      });
    }, 10000);
    
    return () => clearInterval(rotationInterval);
  }, [activeAds.length]);
  
  // Update current ad index when active ads change
  useEffect(() => {
    if (activeAds.length > 0 && currentAdIndex >= activeAds.length) {
      setCurrentAdIndex(0);
    }
  }, [activeAds, currentAdIndex]);
  
  // Close banner
  const closeBanner = () => {
    setShowBanner(false);
  };
  
  if (isLoading || !showBanner || activeAds.length === 0) {
    return null;
  }
  
  const currentAd = activeAds[currentAdIndex];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-grow">
            <div className="relative h-12 w-20 flex-shrink-0">
              <Image
                src={currentAd.image_url}
                alt={`${currentAd.company_name} advertisement`}
                fill
                className="object-cover rounded"
              />
            </div>
            <div className="flex-grow">
              <p className="text-xs text-gray-500">Advertisement</p>
              <Link 
                href={currentAd.website_url} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {currentAd.company_name}
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {activeAds.length > 1 && (
              <div className="flex space-x-1">
                {activeAds.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAdIndex(index)}
                    className={`h-2 w-2 rounded-full ${
                      index === currentAdIndex ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-label={`View ad ${index + 1}`}
                  />
                ))}
              </div>
            )}
            
            <button
              onClick={closeBanner}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close advertisement"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 