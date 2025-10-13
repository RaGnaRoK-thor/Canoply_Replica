import '../styles/globals.css';

export const metadata = {
  title: 'Canoply Chalet',
  description: 'Converted static site served in Next.js'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
