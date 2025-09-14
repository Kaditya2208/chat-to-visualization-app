// src/components/QuestionInput.js
import React, { useState } from 'react';

const QuestionInput = () => {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e) => {
    // This line is CRUCIAL. It stops the page from reloading.
    e.preventDefault(); 
    
    if (!question.trim()) return;

    try {
      await fetch('http://localhost:3001/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'u1', question }),
      });
      setQuestion('');
    } catch (error) {
      console.error("Failed to send question:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="question-input-form">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a scientific question..."
      />
      <button type="submit">Send</button>
    </form>
  );
};

export default QuestionInput;