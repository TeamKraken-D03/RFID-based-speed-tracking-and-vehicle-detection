import React from 'react';
import SpeedMonitor from './components/SpeedMonitor';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>RFID Speed Monitoring System</h1>
      </header>
      <main>
        <SpeedMonitor />
      </main>
      <footer>
        <p>© 2025 RFID Speed Monitor</p>
      </footer>
    </div>
  );
}

export default App;
