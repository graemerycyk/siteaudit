'use client';

import { useState, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Image from 'next/image';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Ad duration options
const adDurationOptions = [
  { id: '30days', name: '30 Days', price: 99, description: 'Basic visibility for one month' },
  { id: '60days', name: '60 Days', price: 199, description: 'Extended visibility for two months' },
  { id: '90days', name: '90 Days', price: 299, description: 'Premium visibility for three months' }
];

export default function AdvertisePage() {
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('30days');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors({...errors, image: 'Please select an image file'});
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({...errors, image: 'Image size should be less than 5MB'});
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear error if exists
      const newErrors = {...errors};
      delete newErrors.image;
      setErrors(newErrors);
    }
  };
  
  // Trigger file input click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (!websiteUrl.trim()) {
      newErrors.websiteUrl = 'Website URL is required';
    } else if (!/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(websiteUrl)) {
      newErrors.websiteUrl = 'Please enter a valid URL';
    }
    
    if (!imageFile) {
      newErrors.image = 'Please upload a header image for your ad';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get selected duration details
      const selectedOption = adDurationOptions.find(option => option.id === selectedDuration);
      
      if (!selectedOption) {
        throw new Error('Invalid duration selected');
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('companyName', companyName);
      formData.append('websiteUrl', websiteUrl);
      formData.append('durationId', selectedDuration);
      formData.append('durationName', selectedOption.name);
      formData.append('price', selectedOption.price.toString());
      
      if (imageFile) {
        formData.append('headerImage', imageFile);
      }
      
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { sessionId } = await response.json();
      
      // Redirect to Stripe checkout
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error submitting ad:', error);
      alert('There was an error processing your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get selected price
  const getSelectedPrice = () => {
    const selected = adDurationOptions.find(option => option.id === selectedDuration);
    return selected ? selected.price : 0;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">Advertise With Us</h1>
        <p className="text-white text-center mb-8">
          Reach our community of professionals and increase your brand visibility
        </p>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <h2 className="text-xl font-semibold">Submit Your Advertisement</h2>
            <p className="text-blue-100">
              Complete the form below to create your advertisement
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Company Name */}
            <div className="mb-4">
              <label htmlFor="companyName" className="block text-gray-700 font-medium mb-2">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2 ${errors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Enter your company name"
              />
              {errors.companyName && (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>
            
            {/* Website URL */}
            <div className="mb-4">
              <label htmlFor="websiteUrl" className="block text-gray-700 font-medium mb-2">
                Website URL
              </label>
              <input
                type="text"
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className={`w-full border rounded-lg px-4 py-2 ${errors.websiteUrl ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="https://example.com"
              />
              {errors.websiteUrl && (
                <p className="text-red-500 text-sm mt-1">{errors.websiteUrl}</p>
              )}
            </div>
            
            {/* Header Image */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Header Image
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-4 text-center ${errors.image ? 'border-red-500' : 'border-gray-300'}`}
              >
                {imagePreview ? (
                  <div className="relative h-48 mb-2">
                    <Image
                      src={imagePreview}
                      alt="Ad preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="py-8">
                    <svg 
                      className="mx-auto h-12 w-12 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload a header image for your advertisement
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  {imagePreview ? 'Change Image' : 'Browse Image'}
                </button>
                
                {errors.image && (
                  <p className="text-red-500 text-sm mt-1">{errors.image}</p>
                )}
              </div>
            </div>
            
            {/* Duration Options */}
            <div className="mb-6">
              <label className="block text-black font-medium mb-2">
                Advertisement Duration
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {adDurationOptions.map((option) => (
                  <div 
                    key={option.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedDuration === option.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedDuration(option.id)}
                  >
                    <div className="flex items-center mb-2">
                      <input
                        type="radio"
                        id={option.id}
                        name="duration"
                        checked={selectedDuration === option.id}
                        onChange={() => setSelectedDuration(option.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor={option.id} className="ml-2 font-medium">
                        {option.name}
                      </label>
                    </div>
                    <p className="text-black text-sm mb-2">{option.description}</p>
                    <p className="text-lg font-bold text-blue-600">£{option.price}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-black mb-2">Order Summary</h3>
              <div className="flex justify-between mb-2">
                <span className="text-black">Advertisement ({adDurationOptions.find(o => o.id === selectedDuration)?.name})</span>
                <span className="text-black">£{getSelectedPrice()}</span>
              </div>
              <div className="border-t border-gray-200 my-2 pt-2 flex justify-between font-bold">
                <span className="text-black">Total</span>
                <span className="text-black">£{getSelectedPrice()}</span>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-blue-600 text-white py-3 px-8 rounded-lg font-semibold ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                } transition-colors`}
              >
                {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl text-black font-semibold mb-4">Why Advertise With Us?</h2>
          <ul className="space-y-2">
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-black">Reach a targeted audience of industry professionals</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-black">Increase brand visibility and recognition</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-black">Drive traffic to your website</span>
            </li>
            <li className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-black">Flexible duration options to suit your budget</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
} 