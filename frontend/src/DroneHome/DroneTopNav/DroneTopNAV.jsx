import React from 'react'
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import WifiIcon from '@mui/icons-material/Wifi';
import Battery6BarIcon from '@mui/icons-material/Battery6Bar';
function DroneTopNAV({data}) {
    return (
        <div className='text-white flex py-1 justify-between'>
            <div className='flex'>
                <div> Drone-101</div>
                <div
                    style={{
                        backgroundImage: 'linear-gradient(to left, rgba(120, 255, 0, 0) 0%, rgba(0, 255, 0, 1) 100%)',
                        color: 'white', // Text color to make it readable
                        display: 'inline-block', // Ensure it doesn’t take full width
                        paddingLeft: '15px',
                        paddingRight: '25px',
                        transform: 'skew(-20deg)', // Create the parallelogram shape
                        textAlign: 'center', // Center the text
                        fontWeight: 'bold'
                    }}
                    className="ml-2"
                >
                    <span
                        style={{
                            display: 'inline-block',
                            transform: 'skew(20deg)', // Undo the skew for the text itself
                        }}
                    >
                        POS-HOLD
                    </span>
                </div>
                {/* <div className='pt-2 px-1 pl-5 ' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> H: </div> */}
          


            </div>
            <div className='flex gap-10'>
                <p className='flex'>
                   { data.fixedType>0?<div className='text-green-500'><SatelliteAltIcon /></div>: <div className='text-red-500'><SatelliteAltIcon /></div>}
                    <p className='text-sm '>{data.sat}</p>
                </p>

                <p className='flex'>
                    < WifiIcon />
                    <p className='text-sm pt-1'>5</p>
                </p>

                <p className='flex'>
                    < Battery6BarIcon />
                    <p className='text-sm pt-1 font-bold text-green-400' >100%</p>
                </p>
            </div>

        </div>
    )
}

export default DroneTopNAV