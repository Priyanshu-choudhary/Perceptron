import React, { useState, useEffect } from 'react';
import MapWithGPS from '../../Map/Map'
import axios from 'axios';

function Buttom2({data}) {
    const [status, setStatus] = useState({
        lat: data.latitude,
        log: data.longitude,
    });
  const [telemetryData, setTelemetryData] = useState(null); // State to store fetched data
  const [loading, setLoading] = useState(true); // State to handle loading state
  const [error, setError] = useState(null); // State to handle error messages


    const fetchData = () => {
        setLoading(true); // Set loading state when refreshing
        setError(null); // Reset error on refresh
        axios
          .get('http://192.168.113.251:9090/sensor_data')
          .then((response) => {
            setTelemetryData(response.data); // Set fetched data in state
            setLoading(false); // Update loading state
            // Fetch data again after 1000ms
            setTimeout(fetchData, 1000);
          })
          .catch((error) => {
            setError('Error fetching data'); // Set error message in case of failure
            setLoading(false); // Update loading state
            // Fetch data again after 1000ms, even if there's an error
            setTimeout(fetchData, 1000);
          });
      };
    
      // Fetch data on component mount
      useEffect(() => {
        fetchData(); // Fetch data when the component mounts
        return () => {
          setLoading(false); // Cleanup function to stop fetching on unmount
        };
      }, []);
    

    return (
        <div className='bg-black flex p-0.5'>
            <div style={{ position: 'absolute', bottom: '0px', left: '30px', width: 150 }}>
                <img src="./public/Radar.png" alt="Radar" />
            </div>

            <div className='pt-2 px-1 pl-5 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> D: </div>
            <div style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '28px' }}> {10} </div>
            <div className='pt-2 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> m </div>

            <div className='pt-2 px-1 pl-5 text-gray-400' style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '20px' }}> H: </div>
            <div style={{ fontFamily: 'Share Tech Mono, cursive', fontSize: '28px' }}> {telemetryData?.data.distance/100 || 0} </div>
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

export default Buttom2
