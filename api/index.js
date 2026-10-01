export default async function handler(req, res) {
  try {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!apiKey || !botToken || !chatId) {
      return res.status(500).json({
        error: "Missing environment variables"
      });
    }

    const url =
      `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.price) {
      return res.status(500).json({
        error: "Could not get XAU/USD price",
        details: data
      });
    }

    const price = Number(data.price);

    const message =
      `🤖 XAU/USD BOT\n\n` +
      `💰 Gold: ${price.toFixed(2)}\n\n` +
      `📊 Status: PRICE RECEIVED\n\n` +
      `⚠️ Automated market information only.`;

    const telegram = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    const telegramData = await telegram.json();

    if (!telegramData.ok) {
      return res.status(500).json({
        error: "Telegram failed",
        details: telegramData
      });
    }

    return res.status(200).json({
      success: true,
      price,
      telegram: true
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
