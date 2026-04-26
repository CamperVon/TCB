import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'The Camp Brand · Projects';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f4ede0',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
        }}
      >
        <div style={{ fontSize: 32, color: '#8b6f2a', letterSpacing: 8, marginBottom: 24 }}>◈ THE CAMP BRAND</div>
        <div style={{ fontSize: 80, color: '#1f1a14', fontWeight: 600, letterSpacing: 4 }}>Projects</div>
        <div style={{ fontSize: 24, color: '#6e6553', marginTop: 24, letterSpacing: 2 }}>Talent Tracker</div>
      </div>
    ),
    { ...size }
  );
}
