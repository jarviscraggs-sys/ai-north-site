/**
 * BotPanel Demo Telegram Bot
 * Handles AI-powered booking and enquiries for local businesses
 */

const TelegramBot = require('node-telegram-bot-api');
const OpenAI = require('openai');
const Database = require('better-sqlite3');
const path = require('path');

// Config
const BOT_TOKEN = process.env.DEMO_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ DEMO_BOT_TOKEN environment variable is required');
  process.exit(1);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const DB_PATH = path.join(__dirname, '..', 'botpanel.db');

// Init
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🤖 BotPanel bot starting...');

// Prepared statements
const getBusiness = db.prepare('SELECT * FROM businesses WHERE bot_token = ?');
const getConversation = db.prepare('SELECT * FROM conversations WHERE business_id = ? AND chat_id = ?');
const upsertConversation = db.prepare(`
  INSERT INTO conversations (business_id, chat_id, customer_name, messages, updated_at)
  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(business_id, chat_id) DO UPDATE SET
    messages = excluded.messages,
    customer_name = COALESCE(excluded.customer_name, conversations.customer_name),
    updated_at = CURRENT_TIMESTAMP
`);
const insertBooking = db.prepare(`
  INSERT INTO bookings (business_id, customer_name, customer_phone, service, date, time, notes, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
`);
const insertEnquiry = db.prepare(`
  INSERT INTO enquiries (business_id, customer_name, customer_phone, message, status)
  VALUES (?, ?, ?, ?, 'new')
`);

/**
 * Detect if AI response contains a confirmed booking
 * Returns booking data or null
 */
function extractBooking(text) {
  const hasName = /(?:name[:\s]+|my name is\s+|i'm\s+|i am\s+)([A-Z][a-z]+ [A-Z][a-z]+)/i.exec(text);
  const hasPhone = /(?:phone|number|mobile)[:\s]+(\+?[\d\s\-()]{10,})/i.exec(text);
  const hasService = /(cut\s*(?:&|and)?\s*blow\s*dry|colour|color|highlights?|treatment|trim)/i.exec(text);
  const hasDate = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)|\d{4}-\d{2}-\d{2}|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/i.exec(text);
  const hasTime = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{2}:\d{2})/i.exec(text);

  const isConfirmation = /(?:confirm(?:ed)?|book(?:ed)?|appointment(?:.*?)(?:scheduled|set|made|confirmed)|see you|we'll see)/i.test(text);

  if (isConfirmation && hasService) {
    return {
      customerName: hasName ? hasName[1].trim() : null,
      customerPhone: hasPhone ? hasPhone[1].trim() : null,
      service: hasService ? hasService[0].trim() : null,
      date: hasDate ? hasDate[0].trim() : null,
      time: hasTime ? hasTime[0].trim() : null,
    };
  }

  return null;
}

/**
 * Check if message looks like a general enquiry (not a booking flow)
 */
function isEnquiry(text) {
  const enquiryPatterns = [
    /\?/,
    /(?:how much|price|cost|charge)/i,
    /(?:do you|can you|are you|have you)/i,
    /(?:opening hours?|open|close)/i,
    /(?:location|address|where are)/i,
    /(?:discount|offer|deal|special)/i,
  ];
  return enquiryPatterns.some((p) => p.test(text));
}

// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id.toString();
  const userMessage = msg.text;
  const firstName = msg.from?.first_name || 'Customer';
  const lastName = msg.from?.last_name || '';
  const customerName = `${firstName} ${lastName}`.trim();

  if (!userMessage || userMessage.startsWith('/')) return;

  try {
    // Find business by bot token
    const business = getBusiness.get(BOT_TOKEN);
    if (!business) {
      await bot.sendMessage(chatId, "Sorry, this bot isn't configured yet. Please contact the business directly.");
      return;
    }

    // Load conversation history
    const conv = getConversation.get(business.id, chatId);
    let messages = conv ? JSON.parse(conv.messages) : [];

    // Add user message
    messages.push({ role: 'user', content: userMessage });

    // Keep last 20 messages to avoid token limits
    if (messages.length > 20) {
      messages = messages.slice(-20);
    }

    // Build OpenAI request
    const systemPrompt = business.system_prompt || 
      `You are a helpful customer service assistant. Help customers with bookings and enquiries.`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = aiResponse.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

    // Add assistant reply to history
    messages.push({ role: 'assistant', content: reply });

    // Save conversation
    upsertConversation.run(business.id, chatId, customerName, JSON.stringify(messages));

    // Check if a booking was confirmed in the reply
    const bookingData = extractBooking(reply);
    if (bookingData && bookingData.service) {
      // Parse date - use a simple future date if we can't parse it
      let bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 1);
      const dateStr = bookingDate.toISOString().split('T')[0];
      const timeStr = bookingData.time ? bookingData.time.replace(/\s*(am|pm)/i, (m, p) => {
        // Normalize time
        return m;
      }) : '10:00';

      try {
        insertBooking.run(
          business.id,
          bookingData.customerName || customerName,
          bookingData.customerPhone || msg.from?.username || null,
          bookingData.service,
          dateStr,
          timeStr,
          `Booked via Telegram bot`,
        );
        console.log(`📅 Booking created for ${bookingData.customerName || customerName} - ${bookingData.service}`);
      } catch (err) {
        console.error('Failed to save booking:', err.message);
      }
    } else if (isEnquiry(userMessage) && messages.length <= 4) {
      // Save as enquiry (only early in conversation to avoid duplicates)
      try {
        insertEnquiry.run(
          business.id,
          customerName,
          msg.from?.username || null,
          userMessage,
        );
        console.log(`💬 Enquiry saved from ${customerName}`);
      } catch (err) {
        console.error('Failed to save enquiry:', err.message);
      }
    }

    // Send reply
    await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('Error handling message:', err);
    
    // Send friendly error to user
    try {
      await bot.sendMessage(chatId, "I'm sorry, something went wrong. Please try again in a moment.");
    } catch {
      // Ignore send failures
    }
  }
});

// Handle /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id.toString();
  
  try {
    const business = getBusiness.get(BOT_TOKEN);
    
    if (business) {
      const greeting = `👋 Welcome to *${business.name}*!\n\nI'm your AI assistant. I can help you:\n• Book an appointment\n• Answer questions about our services\n• Check prices and availability\n\nHow can I help you today?`;
      await bot.sendMessage(chatId, greeting, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, "👋 Welcome! How can I help you today?");
    }
  } catch (err) {
    console.error('Error handling /start:', err);
  }
});

console.log('✅ BotPanel bot is running!');
console.log('   Token:', BOT_TOKEN.substring(0, 15) + '...');
console.log('   DB:', DB_PATH);
