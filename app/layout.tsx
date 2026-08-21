import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Forge & Frame Contracting Co. | Residential Remodeling',
  description: 'Forge & Frame Contracting Co. is a fictional residential contractor specializing in remodeling, renovations, and outdoor living in the Shenandoah Valley and Northern Virginia.',
  keywords: ['residential remodeling', 'kitchen renovation', 'bathroom renovation', 'outdoor living', 'contractor'],
  icons: {
    icon: '/assets/ff-mark-transparent.png',
    apple: '/assets/ff-mark-transparent.png',
  },
  openGraph: {
    title: 'Forge & Frame Contracting Co. | Residential Remodeling',
    description: 'Thoughtful residential remodeling and outdoor living, built with purpose.',
    type: 'website',
    images: [{ url: '/assets/01-forge-frame-hero-exterior.png', width: 1568, height: 1003, alt: 'Crafted residential exterior at sunset' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forge & Frame Contracting Co. | Residential Remodeling',
    description: 'Thoughtful residential remodeling and outdoor living, built with purpose.',
    images: ['/assets/01-forge-frame-hero-exterior.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
