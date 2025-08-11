// Audio utilities for transaction effects
export class TransactionAudio {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.initAudio();
  }

  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
  
      this.enabled = false;
    }
  }

  // Generate a transaction sound based on type and amount
  playTransactionSound(type, amount) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Different frequencies for different transaction types
    const frequencies = {
      payment: 800,
      offer: 600,
      trust: 1000,
      escrow: 400
    };

    oscillator.frequency.setValueAtTime(
      frequencies[type] || 600, 
      this.audioContext.currentTime
    );

    // Volume based on transaction amount (normalized)
    const volume = Math.min(0.1, amount / 1000000 * 0.1);
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  // Resume audio context (needed for Chrome's autoplay policy)
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
} 