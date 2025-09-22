import { useState } from 'react'
import './App.css'
import WebSocketComponent from './Home/Home'
import MapWithGPS from './Map/Map'
import DroneTelemetry from './DroneHome/DroneTelemetry'


function App() {
  // State to track which component is selected
  const [selectedComponent, setSelectedComponent] = useState(null);

  // Function to handle image click and set the component to be shown
  const handleImageClick = (component) => {
    setSelectedComponent(component);
  };

  return (
    <div>
      <div className="flex justify-center gap-48">
        <img
          src={'./public/drone.jpg'}
          alt="Drone Telemetry"
          onClick={() => handleImageClick('droneTelemetry')}
          style={{ cursor: 'pointer', width: '100px', height: '100px', marginRight: '20px' }}
        />
        <img
          src={'./remote.jpg'}
          alt="Web Remote"
          onClick={() => handleImageClick('webRemote')}
          style={{ cursor: 'pointer', width: '100px', height: '100px' }}
        />
      </div>

      {/* Conditionally render the selected component */}
      <div>
        {/* {selectedComponent === 'droneTelemetry' && <DroneTelemetry />} */}
        {selectedComponent === 'webRemote' && <WebSocketComponent />}
        
      </div>
    </div>
  );
}

export default App;
