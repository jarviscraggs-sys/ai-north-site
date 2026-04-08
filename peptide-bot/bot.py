import os
import json
import logging
from datetime import datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from openai import OpenAI

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BOT_TOKEN = "8601923621:AAGfk0J1FaBHZ_lWSFYCkTpm3YhpHamxZTw"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DATA_FILE = "data.json"

# Whitelisted Telegram user IDs — only these can use the bot
# Add partner IDs here when known
ALLOWED_USER_IDS = [
    1411852635,  # Dayne
    7556363124,  # Ben Norman
    # Add partner 3 ID here
]

SYSTEM_PROMPT = """You are an internal AI Operations Manager for Advanced Peptides — a private tool used only by the 3 business partners.

Your focus is purely on internal operations:

1. STOCK MANAGEMENT
- Track stock levels across all products
- Alert when any product drops below 10 units
- Suggest restock quantities based on sales velocity
- Confirm when stock is added or adjusted

2. ORDER TRACKING
- Log every order (customer name, product, quantity, price, status)
- Track status: Pending / Paid / Shipped / Completed
- Flag incomplete order info and ask for it
- Calculate order value automatically

3. PROFIT & FINANCIALS
- Track revenue from orders
- Track cost of goods if provided
- Calculate gross profit and margins
- Provide daily/weekly financial summaries on request

4. REPORTING
- Daily summary: orders taken, revenue, stock changes
- Weekly summary: total sales, profit, top products, low stock
- Answer questions like "how much did we make this week?"

5. DECISION SUPPORT
- Flag slow-moving stock
- Suggest pricing adjustments based on margins
- Highlight trends or issues

Input Examples:
- "Stock update: 50 BPC-157 added, cost £8 each"
- "Order: John, 3x TB-500 at £45 each"
- "Order paid: John TB-500"
- "What's our profit this week?"
- "Show low stock"

Output Rules:
- Clear, structured, concise
- Use bullet points and totals
- Always confirm data you've logged
- Ask if critical info is missing (price, quantity etc)
- Keep responses tight — partners are busy

IMPORTANT:
- No medical advice ever
- No unsupported product claims
- This is an internal business tool only

Current business data is provided at the start of each message."""


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"orders": [], "stock": {}, "issues": []}


def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


def get_data_summary():
    data = load_data()
    orders = data.get("orders", [])
    stock = data.get("stock", {})
    issues = data.get("issues", [])

    pending = [o for o in orders if o.get("status") == "Pending"]
    paid = [o for o in orders if o.get("status") == "Paid"]
    shipped = [o for o in orders if o.get("status") == "Shipped"]
    low_stock = {k: v for k, v in stock.items() if v < 10}

    summary = f"""CURRENT BUSINESS DATA:
Orders: {len(orders)} total ({len(pending)} pending, {len(paid)} paid, {len(shipped)} shipped)
Stock: {json.dumps(stock) if stock else 'No stock logged yet'}
Low Stock Alerts: {json.dumps(low_stock) if low_stock else 'None'}
Open Issues: {len(issues)}
Recent Orders (last 5): {json.dumps(orders[-5:]) if orders else 'None'}
"""
    return summary


conversation_history = {}


async def is_authorised(update: Update) -> bool:
    user_id = update.effective_user.id
    if user_id not in ALLOWED_USER_IDS:
        await update.message.reply_text("⛔ Unauthorised. This is a private business tool.")
        logger.warning(f"Blocked unauthorised access from user ID: {user_id}")
        return False
    return True


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_authorised(update):
        return
    await update.message.reply_text(
        "👋 *Advanced Peptides Operations Bot*\n\n"
        "I'm your AI Operations Manager. I can help with:\n"
        "• 📦 Order tracking & logging\n"
        "• 📊 Stock management\n"
        "• 💬 Customer support drafts\n"
        "• 🔄 Returns & complaints\n"
        "• 📈 Reports & summaries\n\n"
        "Just send me a message to get started!\n\n"
        "Commands:\n"
        "/status — View current orders & stock\n"
        "/clear — Clear conversation history",
        parse_mode="Markdown"
    )


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_authorised(update):
        return
    data = load_data()
    orders = data.get("orders", [])
    stock = data.get("stock", {})

    msg = "📊 *Current Status*\n\n"

    msg += f"*Orders ({len(orders)} total):*\n"
    if orders:
        for o in orders[-10:]:
            msg += f"• {o.get('customer', 'Unknown')} — {o.get('product', '?')} x{o.get('quantity', 1)} — _{o.get('status', 'Pending')}_\n"
    else:
        msg += "• No orders logged yet\n"

    msg += f"\n*Stock:*\n"
    if stock:
        for product, qty in stock.items():
            alert = " ⚠️ LOW" if qty < 10 else ""
            msg += f"• {product}: {qty} units{alert}\n"
    else:
        msg += "• No stock logged yet\n"

    await update.message.reply_text(msg, parse_mode="Markdown")


async def clear(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_authorised(update):
        return
    user_id = update.effective_user.id
    if user_id in conversation_history:
        del conversation_history[user_id]
    await update.message.reply_text("✅ Conversation history cleared.")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await is_authorised(update):
        return
    user_id = update.effective_user.id
    user_name = update.effective_user.first_name or "Partner"
    text = update.message.text

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")

    if user_id not in conversation_history:
        conversation_history[user_id] = []

    conversation_history[user_id].append({"role": "user", "content": text})

    # Keep last 20 messages per user
    if len(conversation_history[user_id]) > 20:
        conversation_history[user_id] = conversation_history[user_id][-20:]

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)

        data_context = get_data_summary()
        full_system = f"{SYSTEM_PROMPT}\n\n{data_context}\n\nCurrent time: {datetime.now().strftime('%Y-%m-%d %H:%M')}\nSpeaking with: {user_name}"

        messages_with_system = [{"role": "system", "content": full_system}] + conversation_history[user_id]

        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1024,
            messages=messages_with_system
        )

        reply = response.choices[0].message.content
        conversation_history[user_id].append({"role": "assistant", "content": reply})

        # Auto-parse data updates from AI context
        await auto_update_data(text)

        # Split long messages
        if len(reply) > 4096:
            for i in range(0, len(reply), 4096):
                await update.message.reply_text(reply[i:i+4096])
        else:
            await update.message.reply_text(reply)

    except Exception as e:
        logger.error(f"Error: {e}")
        await update.message.reply_text(f"⚠️ Error processing request: {str(e)[:200]}")


async def auto_update_data(text: str):
    """Simple keyword-based data extraction to keep records updated."""
    data = load_data()
    text_lower = text.lower()
    updated = False

    # Stock updates: "stock update: 50 BPC-157" or "add 50 BPC-157 to stock"
    import re
    stock_match = re.search(r'stock\s+update[:\s]+(\d+)\s+([A-Za-z0-9\-\s]+)', text, re.IGNORECASE)
    if not stock_match:
        stock_match = re.search(r'add(?:ed)?\s+(\d+)\s+([A-Za-z0-9\-\s]+?)\s+(?:to\s+stock|in\s+stock)', text, re.IGNORECASE)
    if stock_match:
        qty = int(stock_match.group(1))
        product = stock_match.group(2).strip()
        data["stock"][product] = data["stock"].get(product, 0) + qty
        updated = True

    # Order: "Order: John bought 3 TB-500" or "new order: customer X, product Y, qty Z"
    order_match = re.search(r'order[:\s]+([A-Za-z]+)\s+(?:bought|ordered)\s+(\d+)\s+([A-Za-z0-9\-\s]+)', text, re.IGNORECASE)
    if order_match:
        data["orders"].append({
            "customer": order_match.group(1).strip(),
            "product": order_match.group(3).strip(),
            "quantity": int(order_match.group(2)),
            "status": "Pending",
            "date": datetime.now().strftime("%Y-%m-%d %H:%M")
        })
        updated = True

    if updated:
        save_data(data)


def main():
    if not OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not set!")
        return

    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("clear", clear))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Advanced Peptides Bot starting...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
