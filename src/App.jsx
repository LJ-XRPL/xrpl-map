import React from 'react';
import Globe from './components/Globe';
import Sidebar from './components/Sidebar';
import Stablecoins from './components/Stablecoins';
import './App.css';

function App() {
  return (
    <div className="dashboard">
      <Sidebar />
      <main className="main">
        <Globe />
      </main>
      <Stablecoins />
    </div>
  );
}

export default App;