import React, { useState, useEffect, useRef } from 'react';
import { elevenLabsVoice } from '../utils/elevenLabs.js';
import '../styles/VoiceQuery.css';

const VoiceQuery = ({ onQueryResult, onVoiceResponse }) => {
  const [isListening, setIsListening] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  // Note: currentQuery is used for debugging/logging purposes
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  
  const microphoneRef = useRef(null);

  useEffect(() => {
    // Check if ElevenLabs is configured
    setIsConfigured(elevenLabsVoice.isConfigured());
    setIsSupported(elevenLabsVoice.isSupported());
    
    // Set up event listeners
    elevenLabsVoice.onQuery((query, transcript) => {
      setIsProcessing(true);
      setError('');
      setShowResponse(true);
      
      if (onQueryResult) {
        onQueryResult(query, transcript);
      }
    });
    
    elevenLabsVoice.onResponse((response, naturalResponse) => {
      setCurrentResponse(naturalResponse);
      setIsProcessing(false);
      
      if (onVoiceResponse) {
        onVoiceResponse(response, naturalResponse);
      }
    });
    
    // Sync listening state with ElevenLabs
    const checkListeningState = () => {
      const currentListeningState = elevenLabsVoice.getListeningState();
      setIsListening(currentListeningState);
      
      // If we should be listening but recognition stopped, restart it
      if (isListening && !currentListeningState) {
        console.log('🔄 Recognition stopped unexpectedly, force restarting...');
        elevenLabsVoice.forceRestartRecognition();
      }
    };
    
    // Check state more frequently
    const interval = setInterval(checkListeningState, 500);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      elevenLabsVoice.stopListening();
    };
  }, [onQueryResult, onVoiceResponse, isListening]);

  const toggleListening = async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }
    
    // Prevent multiple clicks during startup
    if (isStarting) {
      console.log('🎤 Already starting, ignoring click');
      return;
    }
    
    // Clear any previous errors
    setError('');
    
    if (isListening) {
      // If already listening, stop it
      elevenLabsVoice.stopListening();
      setIsListening(false);
      setShowResponse(false);
      return;
    }
    
    // Set starting state to prevent multiple clicks
    setIsStarting(true);
    
    try {
               // Clear previous results when starting new session
         setCurrentResponse('');
         setShowResponse(false);
      
      // Auto-configure if needed
      if (!isConfigured) {
        console.log('🎤 Using default voice (Rachel)');
        setIsConfigured(true);
      }
      
      const success = elevenLabsVoice.startListening();
      setIsListening(success);
      
      if (success) {
        // Greet the user when starting conversation
        try {
          const greeting = await elevenLabsVoice.greetUser();
          setCurrentResponse(greeting);
          setShowResponse(true);
          
          // Double-check that we're still listening after greeting
          setTimeout(() => {
            const stillListening = elevenLabsVoice.getListeningState();
            console.log('🎤 After greeting - still listening:', stillListening);
            setIsListening(stillListening);
            
            if (!stillListening) {
              console.log('🔄 Recognition stopped after greeting, force restarting...');
              elevenLabsVoice.forceRestartRecognition();
              setIsListening(true);
            }
          }, 1000);
          
          // Additional check after 3 seconds
          setTimeout(() => {
            const stillListening = elevenLabsVoice.getListeningState();
            console.log('🎤 3 seconds after greeting - still listening:', stillListening);
            setIsListening(stillListening);
            
            if (!stillListening) {
              console.log('🔄 Recognition still not active, force restarting again...');
              elevenLabsVoice.forceRestartRecognition();
              setIsListening(true);
            }
          }, 3000);
          
        } catch (error) {
          console.error('Error greeting user:', error);
          setError('Voice setup issue. Please check your ElevenLabs API key.');
          // Reset listening state if greeting fails
          elevenLabsVoice.stopListening();
          setIsListening(false);
        }
      } else {
        setError('Failed to start voice recognition. Please try again.');
      }
    } finally {
      // Always reset starting state
      setIsStarting(false);
    }
  };

  const speakResponse = async () => {
    if (currentResponse) {
      await elevenLabsVoice.speak(currentResponse);
    }
  };

  const clearResults = () => {
    setCurrentResponse('');
    setError('');
    setShowResponse(false);
  };

  if (!isSupported) {
    return (
      <div className="voice-query-floating">
        <button 
          className="voice-floating-button disabled"
          onClick={() => setError('Speech recognition is not supported in this browser')}
          title="Voice recognition not supported"
        >
          🚫
        </button>
      </div>
    );
  }

  return (
    <div className="voice-query-floating">
      {/* Floating Button */}
              <button
          ref={microphoneRef}
          className={`voice-floating-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''} ${isStarting ? 'starting' : ''}`}
          onClick={toggleListening}
          disabled={isStarting}
          title={isStarting ? 'Starting...' : isListening ? 'Listening - Click to stop' : 'Click to start voice query'}
        >
          {isStarting ? '⏳' : isListening ? '🔴' : isProcessing ? '⏳' : '🎤'}
        </button>

      {/* Error Toast */}
      {error && (
        <div className="voice-error-toast">
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Response Toast */}
      {showResponse && currentResponse && (
        <div className="voice-response-toast">
          <div className="response-header">
            <h4>🎤 Response:</h4>
            <button 
              className="speak-button"
              onClick={speakResponse}
              disabled={!isConfigured}
              title="Speak response"
            >
              🔊
            </button>
          </div>
          <p>{currentResponse}</p>
          <button className="clear-button" onClick={clearResults}>
            Clear
          </button>
        </div>
      )}


    </div>
  );
};

export default VoiceQuery;
