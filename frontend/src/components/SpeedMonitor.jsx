import React, { useState, useEffect } from 'react';
import './SpeedMonitor.css';

const SpeedMonitor = () => {
  const [data, setData] = useState({
    speed: '0.00',
    uid: '-',
    timestamp: '-',
    isOverspeeding: false
  });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws = null;
    
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      const port = 3000;
      
      ws = new WebSocket(`${protocol}//${host}:${port}`);
      
      ws.onopen = () => {
        console.log('Connected to WebSocket server');
        setConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          setData(newData);
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setConnected(false);
        
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="speed-monitor">
      <div className="connection-status">
        Status: {connected ? (
          <span className="connected">Connected</span>
        ) : (
          <span className="disconnected">Disconnected</span>
        )}
      </div>
      
      <div className={`speed-display ${data.isOverspeeding ? 'overspeeding' : ''}`}>
        <h2>Current Speed</h2>
        <div className="speed-value">
          {data.speed}
          <span className="unit">m/s</span>
        </div>
        {data.isOverspeeding && (
          <div className="warning">
            ⚠️ OVERSPEEDING DETECTED!
          </div>
        )}
      </div>
      
      <div className="rfid-info">
        <h2>RFID Information</h2>
        <div className="info-row">
          <span className="label">UID:</span>
          <span className="value">{data.uid || 'No reading'}</span>
        </div>
        <div className="info-row">
          <span className="label">Timestamp:</span>
          <span className="value">{data.timestamp || 'No reading'}</span>
        </div>
      </div>
    </div>
  );
};

export default SpeedMonitor;