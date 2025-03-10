import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">SiteAudit</h3>
            <p className="text-gray-300">
              Professional site auditing, simple, effective, free.
            </p>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/audit" className="text-gray-300 hover:text-white transition-colors">
                  Site Audit Tool
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-gray-300 hover:text-white transition-colors">
                  Advertise With Us
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-4">Contact</h3>
            <p className="text-gray-300">
              Email: info@siteaudit.com<br />
              Phone: +44 123 456 7890
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-gray-300">
          <p>&copy; {currentYear} SiteAudit. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 