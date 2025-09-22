import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DroneTopNAV from './DroneTopNav/DroneTopNAV';
import Center from './Center/Center';
import Buttom from './Buttom/Buttom';
import Buttom2 from './Buttom/button2';

function DroneTelemetry() {
  const [telemetryData, setTelemetryData] = useState(null); // State to store fetched data
  const [loading, setLoading] = useState(true); // State to handle loading state
  const [error, setError] = useState(null); // State to handle error messages

  // Dummy data
  const dummyData = {
    fixedType: 0,
    sat: 5,
    latitude: 24.649866,
    longitude: 77.950725,
    altitude: 150,
    speed: 10,
    vbat: 12.5,
    distance: 1000,
    direction: 180,
    heading: 90
  };

  // Fetch data function
  const fetchData = () => {
    setLoading(true); // Set loading state when refreshing
    setError(null); // Reset error on refresh
    axios
      .get('http://192.168.4.1/telemetry')
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

  const data = telemetryData || dummyData;

  return (
    <div className='bg-black w-full text-white'>
      <DroneTopNAV data={data}/>
      <Center/>
      {/* <Buttom data={data}/>  */}
      <Buttom2 data={data}/>
    </div>
  );
}

export default DroneTelemetry;
