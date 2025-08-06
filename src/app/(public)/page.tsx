'use client';

import dynamic from 'next/dynamic';

const SSEClient = dynamic(() => import('@/components/SSEClient'), {
  ssr: false,
});

const LandingPage = () => (
  <SSEClient />
);

export default LandingPage;
