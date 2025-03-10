import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Professional Site Auditing Made Simple
              </h1>
              <p className="text-xl mb-8">
                Capture, annotate, and document site conditions with our easy-to-use audit tool. 
                Generate professional PDF reports in minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/audit" 
                  className="bg-white text-blue-600 hover:bg-gray-100 transition-colors py-3 px-6 rounded-lg font-semibold text-center"
                >
                  Start Site Audit
                </Link>
                <Link 
                  href="/advertise" 
                  className="bg-transparent border-2 border-white hover:bg-white/10 transition-colors py-3 px-6 rounded-lg font-semibold text-center"
                >
                  Advertise With Us
                </Link>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="relative w-full aspect-[474/317]">
                <Image
                  src="/hero-image.jpg"
                  alt="Site Audit Tool"
                  fill
                  className="object-cover rounded-lg shadow-xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
            Trusted by Leading Communities
          </h2>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all">
              <Image
                src="/logos/axis-projects.png"
                alt="Axis Projects"
                fill
                className="object-contain"
              />
            </div>
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all">
              <Image
                src="/logos/cosgrove-flooring.png"
                alt="Cosgrove Flooring"
                fill
                className="object-contain"
              />
            </div>
            {/* Placeholder for future logos */}
            <div className="w-32 h-16 relative grayscale hover:grayscale-0 transition-all opacity-50">
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
                <span className="text-gray-400 text-sm">Your Logo Here</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Site Audit Tool */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Site Audit Tool</h3>
              <p className="text-gray-600 mb-4">
                Capture images, add annotations, and generate professional PDF reports for your site inspections.
              </p>
              <Link href="/audit" className="text-blue-600 hover:text-blue-800 font-medium">
                Try it now →
              </Link>
            </div>
            
            {/* Advertising */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Advertising</h3>
              <p className="text-gray-600 mb-4">
                Promote your business with our flexible advertising options. Reach 1000s of clients, building managers and industry professionals from across the buidling trade.
              </p>
              <Link href="/advertise" className="text-blue-600 hover:text-blue-800 font-medium">
                Learn more →
              </Link>
            </div>
            
            {/* Support */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Support</h3>
              <p className="text-gray-600 mb-4">
                Our team is here to help you get the most out of our tools. Contact us for assistance with any questions.
              </p>
              <a href="mailto:support@siteaudit.com" className="text-blue-600 hover:text-blue-800 font-medium">
                Contact support →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join the growing number of professionals who trust SiteAudit for their site inspection.
          </p>
          <Link 
            href="/audit" 
            className="bg-white text-blue-600 hover:bg-gray-100 transition-colors py-3 px-8 rounded-lg font-semibold inline-block"
          >
            Start Your First Audit
          </Link>
        </div>
      </section>
    </div>
  );
}
