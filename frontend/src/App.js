// src/App.js
import React, { useState, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import VisualizationCanvas from './components/VisualizationCanvas';
import './App.css'; // We will update this file next

function App() {
  const [messages, setMessages] = useState([]);
  const [currentVisualization, setCurrentVisualization] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3001/api/stream');

    eventSource.addEventListener('question_created', (event) => {
      const newQuestion = JSON.parse(event.data);
      setMessages(prev => [...prev, { type: 'question', ...newQuestion }]);
    });

    eventSource.addEventListener('answer_created', (event) => {
      const newAnswer = JSON.parse(event.data);
      setMessages(prev => [...prev, { type: 'answer', ...newAnswer }]);
      setCurrentVisualization(newAnswer.visualization);
    });

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    // Apply the 'dark' class based on the state
    <div className={isDarkMode ? 'App dark' : 'App'}>
      <div className="visualization-pane">
        <VisualizationCanvas 
          visualization={currentVisualization} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode} 
        />
      </div>
      <div className="chat-pane">
        <ChatPanel messages={messages} />
      </div>
    </div>
  );
}

export default App;