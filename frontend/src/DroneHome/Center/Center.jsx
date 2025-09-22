import React from 'react';

export default function Center() {
  return (
    <div>
      <img className='pl-56'
        src="http://192.168.113.251:8080/video_feed_0" 
        alt="Live Stream" 
        style={{
            display: 'flex',
            justifyContent: 'center', // Centers horizontally
            alignItems: 'center', // Centers vertically
        
          }}
      />
    </div>
  );
}
