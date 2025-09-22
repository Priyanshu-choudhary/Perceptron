import React, { useState } from 'react'
import MapWithGPS from '../../Map/Map'

function Buttom({data}) {
    const [status, setStatus] = useState({
        lat: data.latitude,
        log: data.longitude,
    });


    return (
        <div className='bg-black flex p-0.5'>
            <div style={{ position: 'absolute', bottom: '0px', left: '30px', width: 150 }}>
                <img src="./public/Radar.png" alt="Radar" />
            </div>

            <div className='pt-2 px-1 pl-5 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> D: </div>
            <div style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '28px' }}> {data.distance} </div>
            <div className='pt-2 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> m </div>

            <div className='pt-2 px-1 pl-5 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> H: </div>
            <div style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '28px' }}> {data.altitude} </div>
            <div className='pt-2 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> m </div>
            
            <div className='pt-2 px-1 pl-5 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> S: </div>
            <div style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '28px' }}> {data.speed} </div>
            <div className='pt-2 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> m/s </div>

            <div className='flex ml-60 '>
                <div className='  ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '26px' }}>{(data.vbat + 0.2).toFixed(1)}
                </div>
                <div className='pt-2 text-gray-400 ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '18px' }}> v</div>
            </div>

            <div className='flex ml-5 '>
                <div className='  ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '26px' }}> {data.current || 0} </div>
                <div className='pt-2 text-gray-400 ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '18px' }}> A</div>
            </div>

            <div className='flex ml-5 '>
                <div className='  ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '26px' }}>  {data.power || 0} </div>
                <div className='pt-2 text-gray-400 ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '18px' }}> mah</div>
            </div>


            <div style={{ position: 'absolute', bottom: '0px', right: '30px', width: 200, height: 100 }}>
                <MapWithGPS status={status} />
            </div>
        </div>


    )
}

export default Buttom
