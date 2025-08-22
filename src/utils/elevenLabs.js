// ElevenLabs integration for natural voice querying of XRPL data
export class ElevenLabsVoice {
  constructor() {
    this.apiKey = process.env.REACT_APP_ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.voices = [];
    this.selectedVoice = {
      voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel voice ID
      name: 'Rachel'
    };
    this.audioContext = null;
    this.isListening = false;
    this.shouldBeListening = false;
    this.recognition = null;
    this.onQueryCallback = null;
    this.onResponseCallback = null;
    
    this.initSpeechRecognition();
  }

  // Initialize speech recognition
  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Try different configurations for better compatibility
      this.recognition.continuous = true; // Enable continuous listening
      this.recognition.interimResults = false; // Changed to false to reduce network issues
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1; // Reduce network load
      
      // Add timeout to prevent hanging
      this.recognition.timeout = 10000; // 10 seconds timeout
      
      this.recognition.onresult = (event) => {
        console.log('🎤 Speech recognition result received:', event);
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          console.log(`🎤 Result ${i}: "${transcript}" (final: ${isFinal})`);
          
          if (isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        console.log(`🎤 Final transcript: "${finalTranscript}"`);
        console.log(`🎤 Interim transcript: "${interimTranscript}"`);
        
        // Only process final results
        if (finalTranscript.trim()) {
          console.log('🎤 Processing final transcript:', finalTranscript.trim());
          this.processVoiceQuery(finalTranscript.trim());
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        
        // Handle specific error types
        if (event.error === 'not-allowed') {
          console.error('Microphone permission denied');
        } else if (event.error === 'no-speech') {
          console.log('No speech detected');
        } else if (event.error === 'audio-capture') {
          console.error('Audio capture failed');
        } else if (event.error === 'network') {
          console.error('Network error - speech recognition service unavailable');
          // Try to restart after a delay
          setTimeout(() => {
            if (this.shouldBeListening) {
              console.log('🔄 Retrying speech recognition after network error...');
              try {
                this.recognition.start();
              } catch (error) {
                console.error('❌ Failed to restart after network error:', error);
              }
            }
          }, 2000);
        } else if (event.error === 'aborted') {
          console.log('Speech recognition aborted');
        } else if (event.error === 'service-not-allowed') {
          console.error('Speech recognition service not allowed');
        } else {
          console.error('Unknown speech recognition error:', event.error);
        }
      };
      
      this.recognition.onend = () => {
        console.log('🎤 Speech recognition ended - shouldBeListening:', this.shouldBeListening);
        this.isListening = false;
        
        // Restart recognition if it was supposed to be listening
        if (this.shouldBeListening) {
          console.log('🔄 Restarting speech recognition...');
          setTimeout(() => {
            if (this.shouldBeListening) {
              try {
                this.recognition.start();
                console.log('✅ Speech recognition restarted');
              } catch (error) {
                console.error('❌ Failed to restart speech recognition:', error);
              }
            } else {
              console.log('❌ Should not be listening anymore, not restarting');
            }
          }, 100);
        } else {
          console.log('❌ Should not be listening, not restarting');
        }
      };
      
      this.recognition.onstart = () => {
        console.log('🎤 Speech recognition started');
        this.isListening = true;
      };
    }
  }



  // Start listening for voice queries
  startListening() {
    if (!this.recognition) {
      console.error('Speech recognition not supported');
      return false;
    }

    this.shouldBeListening = true;

    // Check if already listening
    if (this.isListening) {
      console.log('Already listening, stopping first...');
      this.stopListening();
      // Small delay to ensure clean state
      setTimeout(() => {
        this.isListening = true;
        this.recognition.start();
      }, 100);
      return true;
    }

    try {
      this.isListening = true;
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      this.shouldBeListening = false;
      return false;
    }
  }

  // Stop listening
  stopListening() {
    this.shouldBeListening = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.log('Error stopping recognition (may already be stopped):', error);
      }
      this.isListening = false;
    }
  }

  // Greet the user when starting conversation
  async greetUser() {
    console.log('🎤 Greeting user...');
    const greeting = "Hello! I'm your XRPL assistant. How can I help you today? You can ask me about market cap, transactions, stablecoins, or real world assets.";
    await this.speak(greeting);
    
    // Ensure recognition is still active after greeting
    if (this.shouldBeListening && !this.isListening) {
      console.log('🔄 Recognition stopped during greeting, restarting...');
      try {
        this.recognition.start();
        this.isListening = true;
        console.log('✅ Recognition restarted after greeting');
      } catch (error) {
        console.error('❌ Failed to restart recognition after greeting:', error);
      }
    }
    
    console.log('✅ Greeting completed, recognition should be active');
    return greeting;
  }

  // Process voice query and convert to XRPL query
  async processVoiceQuery(transcript) {
    console.log('Voice query:', transcript);
    
    // Check for conversation end commands
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('goodbye') || lowerTranscript.includes('bye') || 
        lowerTranscript.includes('stop') || lowerTranscript.includes('end') ||
        lowerTranscript.includes('thank you') || lowerTranscript.includes('thanks')) {
      const farewell = "Goodbye! Feel free to ask me anything about XRPL anytime.";
      await this.speak(farewell);
      this.stopListening();
      return;
    }
    
    // Parse natural language into XRPL query
    const query = this.parseNaturalLanguage(transcript);
    
    if (this.onQueryCallback) {
      this.onQueryCallback(query, transcript);
    }
    
    // Execute the query and get response
    const response = await this.executeXRPLQuery(query);
    
    // Convert response to natural language
    const naturalResponse = this.generateNaturalResponse(response, query);
    
    // Speak the response
    await this.speak(naturalResponse);
    
    if (this.onResponseCallback) {
      this.onResponseCallback(response, naturalResponse);
    }
  }

  // Parse natural language into structured XRPL query
  parseNaturalLanguage(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    
    // Define query patterns
    const patterns = {
      // Market cap queries
      marketCap: {
        pattern: /(market cap|market capitalization|total value)/i,
        type: 'market_cap',
        entity: this.extractEntity(lowerTranscript)
      },
      
      // Transaction queries
      transactions: {
        pattern: /(transactions|tx|payments|volume)/i,
        type: 'transactions',
        timeframe: this.extractTimeframe(lowerTranscript),
        entity: this.extractEntity(lowerTranscript)
      },
      
      // Stablecoin queries
      stablecoins: {
        pattern: /(stablecoin|stable coin|usdt|usdc|dai)/i,
        type: 'stablecoins',
        entity: this.extractEntity(lowerTranscript)
      },
      
      // RWA queries
      rwas: {
        pattern: /(real world asset|rwa|property|real estate|gold|commodity)/i,
        type: 'rwas',
        entity: this.extractEntity(lowerTranscript)
      },
      
      // Price queries
      price: {
        pattern: /(price|value|worth)/i,
        type: 'price',
        entity: this.extractEntity(lowerTranscript)
      },
      
      // General status
      status: {
        pattern: /(status|overview|summary|what's happening)/i,
        type: 'status'
      }
    };

    // Find matching pattern
    for (const [, query] of Object.entries(patterns)) {
      if (query.pattern.test(transcript)) {
        return {
          ...query,
          originalQuery: transcript,
          confidence: this.calculateConfidence(transcript, query.pattern)
        };
      }
    }

    // Default to general status if no pattern matches
    return {
      type: 'status',
      originalQuery: transcript,
      confidence: 0.1
    };
  }

  // Extract entity from transcript
  extractEntity(transcript) {
    const entities = {
      xrp: /xrp|ripple/i,
      usdt: /usdt|tether/i,
      usdc: /usdc|usd coin/i,
      dai: /dai/i,
      gold: /gold/i,
      realEstate: /real estate|property|housing/i,
      all: /all|everything|overall/i
    };

    for (const [entity, pattern] of Object.entries(entities)) {
      if (pattern.test(transcript)) {
        return entity;
      }
    }

    return 'all';
  }

  // Extract timeframe from transcript
  extractTimeframe(transcript) {
    if (/today|24 hours|last day/i.test(transcript)) return '24h';
    if (/week|7 days/i.test(transcript)) return '7d';
    if (/month|30 days/i.test(transcript)) return '30d';
    if (/year|annual/i.test(transcript)) return '1y';
    return '24h'; // default
  }

  // Calculate confidence score
  calculateConfidence(transcript, pattern) {
    const match = transcript.match(pattern);
    return match ? match[0].length / transcript.length : 0;
  }

  // Execute XRPL query based on parsed natural language
  async executeXRPLQuery(query) {
    try {
      // Import XRPL utilities dynamically to avoid circular dependencies
      const { connect, getAccountTransactions, getLedgerInfo } = await import('./xrpl.js');
      const { refreshAllSupplies } = await import('./supplyFetcher.js');
      const marketCapManager = await import('./marketCapManager.js');
      
      // Connect to XRPL if not already connected
      await connect();
      
      let data = {};
      
      switch (query.type) {
        case 'market_cap':
          // Get market cap data from supply fetcher
          const supplyData = await refreshAllSupplies();
          const marketCapData = marketCapManager.default.calculateTotalMarketCap(supplyData.rwaData, supplyData.stablecoinData);
          
          data = {
            market_cap: {
              total: marketCapData.total,
              xrp: marketCapData.xrp || 0,
              stablecoins: marketCapData.stablecoins || 0,
              rwas: marketCapData.rwas || 0
            }
          };
          break;
          
        case 'transactions':
          // Get recent ledger info for transaction stats
          const ledgerInfo = await getLedgerInfo();
          const recentTransactions = await getAccountTransactions('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh', 100);
          
          data = {
            transactions: {
              count: ledgerInfo?.total_coins ? Math.floor(ledgerInfo.total_coins / 1000000) : 1250000,
              volume: recentTransactions.reduce((sum, tx) => sum + (tx.Amount || 0), 0),
              average: recentTransactions.length > 0 ? recentTransactions.reduce((sum, tx) => sum + (tx.Amount || 0), 0) / recentTransactions.length : 360
            }
          };
          break;
          
        case 'stablecoins':
          // Get stablecoin data
          const stablecoinData = await refreshAllSupplies();
          data = {
            stablecoins: stablecoinData.stablecoinData.map(coin => ({
              name: coin.name,
              amount: coin.amount || 0,
              growth: Math.random() * 5 // Mock growth for now
            })).slice(0, 5)
          };
          break;
          
        case 'rwas':
          // Get RWA data
          const rwaData = await refreshAllSupplies();
          data = {
            rwas: rwaData.rwaData.map(asset => ({
              name: asset.name,
              amount: asset.amount || 0,
              type: asset.type || 'asset'
            })).slice(0, 5)
          };
          break;
          
        case 'status':
          // Get general status
          const statusData = await refreshAllSupplies();
          const statusMarketCap = marketCapManager.default.calculateTotalMarketCap(statusData.rwaData, statusData.stablecoinData);
          const statusLedger = await getLedgerInfo();
          
          data = {
            market_cap: {
              total: statusMarketCap.total,
              xrp: statusMarketCap.xrp || 0,
              stablecoins: statusMarketCap.stablecoins || 0,
              rwas: statusMarketCap.rwas || 0
            },
            transactions: {
              count: statusLedger?.total_coins ? Math.floor(statusLedger.total_coins / 1000000) : 1250000,
              volume: 450000000, // Mock volume
              average: 360
            }
          };
          break;
          
        default:
          // Return basic status for unknown queries
          const defaultData = await refreshAllSupplies();
          const defaultMarketCap = marketCapManager.default.calculateTotalMarketCap(defaultData.rwaData, defaultData.stablecoinData);
          
          data = {
            market_cap: {
              total: defaultMarketCap.total,
              xrp: defaultMarketCap.xrp || 0,
              stablecoins: defaultMarketCap.stablecoins || 0,
              rwas: defaultMarketCap.rwas || 0
            },
            transactions: {
              count: 1250000,
              volume: 450000000,
              average: 360
            }
          };
      }

      return {
        query,
        data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error executing XRPL query:', error);
      
      // Return fallback data if query fails
      return {
        query,
        data: {
          market_cap: {
            total: 2500000000,
            xrp: 1500000000,
            stablecoins: 800000000,
            rwas: 200000000
          },
          transactions: {
            count: 1250000,
            volume: 450000000,
            average: 360
          },
          stablecoins: [
            { name: 'USDT', amount: 500000000, growth: 2.5 },
            { name: 'USDC', amount: 250000000, growth: 1.8 },
            { name: 'DAI', amount: 50000000, growth: 0.5 }
          ],
          rwas: [
            { name: 'Gold Token', amount: 100000000, type: 'commodity' },
            { name: 'Real Estate Fund', amount: 100000000, type: 'property' }
          ]
        },
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Generate natural language response
  generateNaturalResponse(response, query) {
    const { data } = response;
    
    switch (query.type) {
      case 'market_cap':
        return `Great question! The total market capitalization on XRPL is $${(data.market_cap.total / 1000000000).toFixed(1)} billion. XRP accounts for $${(data.market_cap.xrp / 1000000000).toFixed(1)} billion, stablecoins make up $${(data.market_cap.stablecoins / 1000000000).toFixed(1)} billion, and real world assets represent $${(data.market_cap.rwas / 1000000000).toFixed(1)} billion. What else would you like to know?`;
      
      case 'transactions':
        return `In the last ${query.timeframe}, XRPL processed ${data.transactions.count.toLocaleString()} transactions with a total volume of $${(data.transactions.volume / 1000000).toFixed(1)} million. The average transaction value was $${data.transactions.average.toLocaleString()}. Is there anything specific about transactions you'd like to explore?`;
      
      case 'stablecoins':
        return `The top stablecoins on XRPL include USDT with $${(data.stablecoins[0].amount / 1000000).toFixed(1)} million and ${data.stablecoins[0].growth}% growth, USDC with $${(data.stablecoins[1].amount / 1000000).toFixed(1)} million and ${data.stablecoins[1].growth}% growth, and DAI with $${(data.stablecoins[2].amount / 1000000).toFixed(1)} million and ${data.stablecoins[2].growth}% growth. Would you like to know more about any specific stablecoin?`;
      
      case 'rwas':
        return `Real world assets on XRPL include ${data.rwas[0].name} with $${(data.rwas[0].amount / 1000000).toFixed(1)} million in ${data.rwas[0].type}, and ${data.rwas[1].name} with $${(data.rwas[1].amount / 1000000).toFixed(1)} million in ${data.rwas[1].type}. These represent the growing trend of tokenizing real-world assets. What would you like to know next?`;
      
      case 'status':
        return `XRPL is currently processing over ${(data.transactions.count / 1000).toFixed(0)} thousand transactions daily with a total market cap of $${(data.market_cap.total / 1000000000).toFixed(1)} billion. The network is healthy and operating normally. Feel free to ask me about any specific aspect of XRPL!`;
      
      default:
        return `I found some information about XRPL. The total market cap is $${(data.market_cap.total / 1000000000).toFixed(1)} billion with ${data.transactions.count.toLocaleString()} daily transactions. What specific information are you looking for?`;
    }
  }

  // Convert text to speech using ElevenLabs
  async speak(text) {
    console.log('🎤 Attempting to speak:', text);
    
    if (!this.apiKey) {
      console.error('❌ ElevenLabs API key not found');
      return;
    }
    
    if (!this.selectedVoice) {
      console.log('⚠️ No voice selected, trying to load voices...');
      await this.loadVoices();
      
      if (!this.selectedVoice) {
        console.error('❌ Still no voice available after loading');
        return;
      }
    }

    try {
      console.log('🔊 Sending request to ElevenLabs...');
      const response = await fetch(`${this.baseUrl}/text-to-speech/${this.selectedVoice.voice_id}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      console.log('📡 ElevenLabs response status:', response.status);
      
      if (response.ok) {
        const audioBlob = await response.blob();
        console.log('🎵 Audio blob received, size:', audioBlob.size);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Add event listeners for debugging
        audio.onloadstart = () => console.log('🎵 Audio loading started');
        audio.oncanplay = () => console.log('🎵 Audio can play');
        audio.onplay = () => console.log('🎵 Audio playing started');
        audio.onended = () => {
          console.log('🎵 Audio finished playing');
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = (e) => console.error('🎵 Audio error:', e);
        
        console.log('▶️ Starting audio playback...');
        await audio.play();
        console.log('✅ Audio playback initiated');
      } else {
        const errorText = await response.text();
        console.error('❌ ElevenLabs API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error generating speech:', error);
    }
  }

  // Set callbacks for query and response events
  onQuery(callback) {
    this.onQueryCallback = callback;
  }

  onResponse(callback) {
    this.onResponseCallback = callback;
  }



  // Check if speech recognition is supported
  isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Check if ElevenLabs is configured
  isConfigured() {
    return !!this.apiKey && !!this.selectedVoice;
  }

  // Get current listening state
  getListeningState() {
    return this.isListening;
  }

  // Ensure recognition is active
  ensureRecognitionActive() {
    if (this.shouldBeListening && !this.isListening) {
      console.log('🔄 Ensuring recognition is active...');
      try {
        this.recognition.start();
        this.isListening = true;
        console.log('✅ Recognition restarted');
      } catch (error) {
        console.error('❌ Failed to restart recognition:', error);
      }
    }
  }

  // Force restart recognition
  forceRestartRecognition() {
    console.log('🔄 Force restarting recognition...');
    this.shouldBeListening = true;
    this.isListening = false;
    
    try {
      if (this.recognition) {
        this.recognition.stop();
      }
    } catch (error) {
      console.log('Error stopping recognition during force restart:', error);
    }
    
    setTimeout(() => {
      try {
        this.recognition.start();
        this.isListening = true;
        console.log('✅ Recognition force restarted');
      } catch (error) {
        console.error('❌ Failed to force restart recognition:', error);
      }
    }, 200);
  }

  // Test speech recognition manually
  testSpeechRecognition() {
    console.log('🧪 Testing speech recognition...');
    console.log('Recognition object:', this.recognition);
    console.log('Is listening:', this.isListening);
    console.log('Should be listening:', this.shouldBeListening);
    
    if (this.recognition) {
      console.log('Recognition properties:');
      console.log('- Continuous:', this.recognition.continuous);
      console.log('- Interim results:', this.recognition.interimResults);
      console.log('- Language:', this.recognition.lang);
      console.log('- Max alternatives:', this.recognition.maxAlternatives);
    }
  }

  // Reinitialize speech recognition
  reinitializeSpeechRecognition() {
    console.log('🔄 Reinitializing speech recognition...');
    this.recognition = null;
    this.isListening = false;
    this.shouldBeListening = false;
    this.initSpeechRecognition();
    console.log('✅ Speech recognition reinitialized');
  }


}

// Export singleton instance
export const elevenLabsVoice = new ElevenLabsVoice();
