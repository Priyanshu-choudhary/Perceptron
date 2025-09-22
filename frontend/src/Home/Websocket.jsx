import React, { useEffect, useState, useRef } from 'react';

const useWebSocket = (url) => {
    const socket = useRef(null);
    const [status, setStatus] = useState({ connectedClients: 0 });
    const [connection, setConnection] = useState(false);

    useEffect(() => {
        socket.current = new WebSocket(url);

        socket.current.onopen = () => {
            console.log('WebSocket connected');
            setConnection(true);
        };

        socket.current.onmessage = (event) => {
            const message = event.data;

            // Extract the number of connected clients if the message starts with "ConnectedClients"
            if (message.startsWith("ConnectedClients")) {
                const count = parseInt(message.split(":")[1].trim(), 10);
                setStatus((prevStatus) => ({
                    ...prevStatus,
                    connectedClients: count,
                }));
            } else if (message.includes(',')) {
                // Handle CSV messages
                const parts = message.split(',');
                if (parts.length === 7) {
                    const [aux, batteryVoltage, lat, log, speed,sat,time] = parts;
                    console.log(message);
                    
                    setStatus((prevStatus) => ({
                        ...prevStatus,
                        aux: parseFloat(aux),
                        batteryVoltage: parseFloat(batteryVoltage),
                        lat: parseFloat(lat),
                        log: parseFloat(log),
                        speed: parseFloat(speed),
                        sat: parseFloat(sat),
                        time: parseInt(time),
                    }));

                }
            }
        };

        socket.current.onclose = () => {
            console.log('WebSocket closed');
            setConnection(false);
        };

        return () => {
            if (socket.current) socket.current.close();
        };
    }, [url]);

    const send = (data) => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            socket.current.send(data);
        } else {
            setConnection(false);
        }
    };

    return { send, status, connection };
};

export default useWebSocket;
