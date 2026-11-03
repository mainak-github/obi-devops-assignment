import { useEffect, useState } from 'react';
import { getHealth } from './services/api';

function App() {
  const [health, setHealth] = useState<string>('checking');

  useEffect(() => {
    let active = true;

    getHealth()
      .then(({ status }) => {
        if (active) setHealth(status);
      })
      .catch(() => {
        if (active) setHealth('unavailable');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="app">
      <h1>OBI DevOps Assignment</h1>
      <p>Three-tier application starter</p>
      <p className="health" role="status">API status: {health}</p>
    </main>
  );
}

export default App;
