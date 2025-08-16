// Twitter integration for posting transaction updates
class TwitterIntegration {
  constructor() {
    this.enabled = false;
    this.apiKey = process.env.REACT_APP_TWITTER_API_KEY;
    this.apiSecret = process.env.REACT_APP_TWITTER_API_SECRET;
    this.accessToken = process.env.REACT_APP_TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.REACT_APP_TWITTER_ACCESS_TOKEN_SECRET;
    this.bearerToken = process.env.REACT_APP_TWITTER_BEARER_TOKEN;
    
    // Check if Twitter credentials are available
    if (this.bearerToken) {
      this.enabled = true;
      console.log('🐦 Twitter integration enabled');
    } else {
      console.log('🐦 Twitter integration disabled - missing credentials');
    }
  }

  // Format transaction data for tweet
  formatTransactionTweet(transaction) {
    const { type, amount, currency, from, to, issuer } = transaction;
    
    // Format amount with appropriate precision
    const formattedAmount = this.formatAmount(amount);
    
    // Get issuer name if available
    const issuerName = issuer?.name || 'Unknown Asset';
    
    // Create tweet content
    let tweetText = `🔔 New ${type} on #XRPL\n`;
    tweetText += `💰 ${formattedAmount} ${currency}\n`;
    tweetText += `🏢 ${issuerName}\n`;
    
    // Add transaction details
    if (from && to) {
      tweetText += `📤 ${this.truncateAddress(from)}\n`;
      tweetText += `📥 ${this.truncateAddress(to)}\n`;
    }
    
    // Add hashtags
    tweetText += `\n#XRP #XRPL #RealWorldAssets #Blockchain`;
    
    // Ensure tweet is under 280 characters
    if (tweetText.length > 280) {
      tweetText = tweetText.substring(0, 277) + '...';
    }
    
    return tweetText;
  }

  // Format amount with appropriate precision
  formatAmount(amount) {
    if (!amount || amount === 0) return '0';
    
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    } else {
      return amount.toFixed(2);
    }
  }

  // Truncate address for display
  truncateAddress(address) {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  }

  // Post tweet using Twitter API v2
  async postTweet(tweetText) {
    if (!this.enabled) {
      console.log('🐦 Twitter integration disabled, skipping tweet');
      return false;
    }

    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🐦 Tweet posted successfully:', result);
        return true;
      } else {
        const error = await response.json();
        console.error('🐦 Failed to post tweet:', error);
        return false;
      }
    } catch (error) {
      console.error('🐦 Error posting tweet:', error);
      return false;
    }
  }

  // Post transaction update
  async postTransactionUpdate(transaction) {
    if (!this.enabled) return false;
    
    try {
      const tweetText = this.formatTransactionTweet(transaction);
      return await this.postTweet(tweetText);
    } catch (error) {
      console.error('🐦 Error posting transaction update:', error);
      return false;
    }
  }

  // Toggle Twitter integration
  toggle() {
    this.enabled = !this.enabled;
    console.log(`🐦 Twitter integration ${this.enabled ? 'enabled' : 'disabled'}`);
    return this.enabled;
  }

  // Check if integration is enabled
  isEnabled() {
    return this.enabled;
  }
}

// Create singleton instance
const twitterIntegration = new TwitterIntegration();

export default twitterIntegration;
