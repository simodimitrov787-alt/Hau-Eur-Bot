export default async function handler(req, res) {
  try {
    const API_KEY = process.env.TWELVEDATA_API_KEY;
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!API_KEY || !BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({
        error: "Missing environment variables"
      });
    }

    // Get current XAU/USD price
    const priceResponse = await fetch(
      `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${API_KEY}`
    );

    const priceData = await priceResponse.json();

    if (!priceData.price) {
      return res.status(500).json({
        error: "Could not get XAU/USD price",
        details: priceData
      });
    }

    const price = Number(priceData.price);

    // Get recent candles
    const candlesResponse = await fetch(
      `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=15min&outputsize=30&apikey=${API_KEY}`
    );

    const candlesData = await candlesResponse.json();

    if (!candlesData.values) {
      return res.status(500).json({
        error: "Could not get candle data",
        details: candlesData
      });
    }

    const candles = candlesData.values;

    const closes = candles
      .map(c => Number(c.close))
      .reverse();

    const highs = candles
      .map(c => Number(c.high))
      .reverse();

    const lows = candles
      .map(c => Number(c.low))
      .reverse();

    // Simple moving averages
    const sma = (arr, period) =>
      arr.slice(-period).reduce((a, b) => a + b, 0) / period;

    const sma10 = sma(closes, 10);
    const sma20 = sma(closes, 20);

    // Basic momentum
    const previous = closes[closes.length - 2];
    const change = price - previous;
    const changePercent = (change / previous) * 100;

    // Recent support / resistance
    const recentHigh = Math.max(...highs.slice(-20));
    const recentLow = Math.min(...lows.slice(-20));

    let signal = "WAIT";
    let reason = "Market conditions are mixed.";

    if (price > sma10 && sma10 > sma20 && changePercent > 0) {
      signal = "BUY";
      reason = "Price is above SMA10 and SMA20 with positive short-term momentum.";
    }

    if (price < sma10 && sma10 < sma20 && changePercent < 0) {
      signal = "SELL";
      reason = "Price is below SMA10 and SMA20 with negative short-term momentum.";
    }

    const message =
`🤖 XAU/USD ALERT

💰 Price: ${price.toFixed(2)}

📊 Signal: ${signal}

📈 SMA10: ${sma10.toFixed(2)}
📉 SMA20: ${sma20.toFixed(2)}

⚡ 15m change: ${changePercent.toFixed(3)}%

🔺 Resistance: ${recentHigh.toFixed(2)}
🔻 Support: ${recentLow.toFixed(2)}

🧠 Analysis:
${reason}

⚠️ This is an automated market analysis signal, not a guaranteed prediction.`;

    // Send Telegram message
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message
        })
      }
    );

    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      return res.status(500).json({
        error: "Telegram message failed",
        details: telegramData
      });
    }

    return res.status(200).json({
      success: true,
      signal,
      price,
      message
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
