import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Site auditing | Punch list | Snag List reports by SiteAudit",
  description: "SiteAudit is an easy to use auditing and snagging tool for web, mobile and tablet devices, which helps generate reports for Site auditing and Punch list items. Professional Site Audit Management, making audits and inspections quick to carry out and simple to manage.",
  keywords: "site audit, punch list, snag list, site inspection, construction audit, property inspection, audit reports, snagging tool",
  authors: [{ name: "SiteAudit Team" }],
  creator: "SiteAudit",
  publisher: "SiteAudit",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Site auditing | Punch list | Snag List reports by SiteAudit",
    description: "SiteAudit is an easy to use auditing and snagging tool for web, mobile and tablet devices, which helps generate reports for Site auditing and Punch list items.",
    url: "https://siteaudit.app",
    siteName: "SiteAudit",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Site auditing | Punch list | Snag List reports by SiteAudit",
    description: "Professional Site Audit Management, making audits and inspections quick to carry out and simple to manage.",
    creator: "@siteaudit",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "verification_token",
    // Add your actual verification tokens here
  },
  category: "construction",
}; 