import React from 'react';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Canoply Chalet</title>
      </Head>
      {/* Render static index.html from public to preserve original markup and assets */}
      <iframe src="/index.html" style={{border:0, width:'100%', height:'100vh'}} title="canoply-static" />
    </>
  );
}
