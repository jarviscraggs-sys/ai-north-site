export type BusinessStatus = "LIVE" | "ACTIVE" | "IN DEVELOPMENT" | "PLANNED";
export type StageStatus = "complete" | "in-progress" | "pending";

export interface BusinessLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface Stage {
  name: string;
  status: StageStatus;
  note?: string;
}

export interface Business {
  id: string;
  name: string;
  emoji: string;
  status: BusinessStatus;
  url?: string;
  description: string;
  tagline?: string;
  revenue?: string;
  target?: string;
  stats?: { label: string; value: string }[];
  links?: BusinessLink[];
  notes?: string;
  stages?: Stage[];
  nextAction?: string;
}

export const businesses: Business[] = [
  {
    id: "clearclaim",
    name: "ClearClaim",
    emoji: "🏗️",
    status: "LIVE",
    url: "https://getclearclaim.co.uk",
    description: "Construction invoice management platform for UK contractors",
    tagline: "CIS auto-calculation, AI duplicate detection, subcontractor portals",
    revenue: "£0 (pre-revenue)",
    target: "£149/mo per contractor",
    stats: [
      { label: "Contractors", value: "0" },
      { label: "MRR", value: "£0" },
      { label: "Demo Meeting", value: "Tomorrow" },
    ],
    links: [
      { label: "Live Site", href: "https://getclearclaim.co.uk", external: true },
      { label: "Admin", href: "https://getclearclaim.co.uk/admin", external: true },
      { label: "GitHub", href: "https://github.com/jarviscraggs-sys/clearclaim", external: true },
      { label: "Railway", href: "https://railway.app", external: true },
    ],
    stages: [
      { name: "MVP Built", status: "complete" },
      { name: "Domain & Hosting", status: "complete", note: "getclearclaim.co.uk on Railway" },
      { name: "Auth & Login", status: "complete" },
      { name: "Demo Data", status: "complete" },
      { name: "Admin Panel", status: "complete" },
      { name: "Email (Resend)", status: "complete" },
      { name: "Multi-admin Team", status: "complete" },
      { name: "First Demo (King Brothers)", status: "in-progress", note: "Tomorrow" },
      { name: "First Paying Customer", status: "pending" },
      { name: "Stripe Billing", status: "pending" },
      { name: "10 Customers", status: "pending" },
    ],
    nextAction: "Demo with King Brothers tomorrow — use KINGBROTHERS promo code",
  },
  {
    id: "clayo",
    name: "Clayo",
    emoji: "🤖",
    status: "LIVE",
    url: "https://clayo.co.uk",
    description: "AI bot platform for local businesses",
    tagline: "WhatsApp & Telegram bots with booking calendar and enquiries inbox",
    revenue: "£0 (pre-revenue)",
    target: "£99 setup + £29/mo per business",
    stats: [
      { label: "Businesses", value: "0" },
      { label: "MRR", value: "£0" },
      { label: "Status", value: "Live ✅" },
    ],
    links: [
      { label: "Live Site", href: "https://clayo-production.up.railway.app", external: true },
      { label: "Admin", href: "https://clayo-production.up.railway.app/admin", external: true },
      { label: "GitHub", href: "https://github.com/jarviscraggs-sys/clayo", external: true },
    ],
    stages: [
      { name: "MVP Built", status: "complete" },
      { name: "Business Portal", status: "complete", note: "Calendar, bookings, enquiries" },
      { name: "Admin Panel", status: "complete" },
      { name: "Signup Flow", status: "complete" },
      { name: "Telegram Bot", status: "complete" },
      { name: "WhatsApp (Twilio)", status: "complete" },
      { name: "Railway Deployment", status: "complete" },
      { name: "clayo.co.uk domain", status: "in-progress", note: "DNS propagating" },
      { name: "First Business Signed Up", status: "pending" },
      { name: "Stripe Billing", status: "pending" },
      { name: "10 Businesses", status: "pending" },
    ],
    nextAction: "Sign up first local business — visit a salon or restaurant in Sunderland",
  },
  {
    id: "mane-brand",
    name: "The Mane Brand",
    emoji: "💛",
    status: "IN DEVELOPMENT",
    description: "Premium UK hair extensions business website",
    tagline: "Landing page with AI chatbot, ready to deploy",
    stats: [
      { label: "Instagram", value: "@themanebrand_" },
      { label: "Status", value: "Site built" },
    ],
    links: [
      { label: "Local Preview", href: "file:///Users/jarvis/.openclaw/workspace/mane-brand/index.html", external: true },
      { label: "Instagram", href: "https://www.instagram.com/themanebrand_", external: true },
    ],
    stages: [
      { name: "Website Built", status: "complete", note: "index.html with 9 sections" },
      { name: "AI Chatbot Added", status: "complete", note: "GPT-4o-mini, brand-locked" },
      { name: "Domain Purchased", status: "pending", note: "themanebrand.co.uk" },
      { name: "Deploy to Hosting", status: "pending" },
      { name: "Product Pages", status: "pending" },
      { name: "Checkout / Shop", status: "pending" },
    ],
    nextAction: "Buy themanebrand.co.uk domain and deploy",
  },
  {
    id: "advanced-peptides",
    name: "Advanced Peptides",
    emoji: "💊",
    status: "ACTIVE",
    description: "Peptide business operations managed via Telegram bot",
    tagline: "Stock tracking, order logging, profit reports for 3 partners",
    stats: [
      { label: "Partners", value: "3" },
      { label: "Bot", value: "@advanced_peptidesbot" },
    ],
    links: [
      { label: "Telegram Bot", href: "https://t.me/advanced_peptidesbot", external: true },
    ],
    stages: [
      { name: "Telegram Bot Built", status: "complete" },
      { name: "Partners Whitelisted", status: "in-progress", note: "Dayne + Ben, 3rd pending" },
      { name: "Stock Tracking", status: "complete" },
      { name: "Order Logging", status: "complete" },
      { name: "Profit Reports", status: "complete" },
      { name: "3rd Partner Added", status: "pending" },
    ],
    nextAction: "Add 3rd partner — ask them to message the bot to get their ID",
  },
  {
    id: "trading-bot",
    name: "ClearTrade",
    emoji: "📈",
    status: "ACTIVE",
    description: "Multi-strategy paper trading bot on BTC/USDT",
    tagline: "5 strategies competing simultaneously — paper trading to find the winner",
    stats: [
      { label: "Strategies", value: "5" },
      { label: "Paper Capital", value: "£50,000" },
      { label: "Status", value: "Running" },
    ],
    links: [
      { label: "Logs", href: "file:///tmp/trading-bot.log", external: true },
    ],
    stages: [
      { name: "5 Strategies Built", status: "complete", note: "RSI, EMA, Bollinger, MACD, Momentum" },
      { name: "Paper Trading Live", status: "complete" },
      { name: "Telegram Alerts", status: "complete" },
      { name: "2 Week Test Period", status: "in-progress" },
      { name: "Pick Winning Strategy", status: "pending" },
      { name: "Deploy with Real Money", status: "pending" },
      { name: "Connect Exchange Account", status: "pending" },
    ],
    nextAction: "Let bot run for 2 weeks then review leaderboard",
  },
  {
    id: "pureglow",
    name: "PureGlow",
    emoji: "☀️",
    status: "IN DEVELOPMENT",
    description: "Sunbed salon management platform with customer mobile app",
    tagline: "Bed booking, AI staff assistant, product shop, deals — Salon Tracker killer",
    revenue: "£0 (pre-revenue)",
    target: "£99/mo per salon",
    stats: [
      { label: "Status", value: "Building" },
      { label: "Replacing", value: "Salon Tracker £100/mo" },
      { label: "Phase", value: "1 of 3" },
    ],
    links: [
      { label: "GitHub", href: "https://github.com/jarviscraggs-sys/pureglow", external: true },
    ],
    stages: [
      { name: "Requirements & Brief", status: "complete", note: "Beds, booking, AI assistant, product shop, app" },
      { name: "Phase 1 — Core Booking System", status: "in-progress", note: "Bed management, appointments, staff portal" },
      { name: "Phase 1 — Customer Mobile App", status: "pending", note: "Live bed availability, booking, login" },
      { name: "Phase 2 — Product Shop", status: "pending", note: "In-app purchases, stock management" },
      { name: "Phase 2 — Deals & Promotions", status: "pending", note: "Push notifications, offers feed" },
      { name: "Phase 3 — AI Staff Assistant", status: "pending", note: "Natural language commands for staff" },
      { name: "Data Migration from Salon Tracker", status: "pending", note: "CSV import of customers + history" },
      { name: "Go Live at PureGlow", status: "pending" },
      { name: "Launch as SaaS to other salons", status: "pending" },
    ],
    nextAction: "Send Salon Tracker export + bed list + services list to Jarvis to begin Phase 1 build",
  },
  {
    id: "ai-agency",
    name: "AI Agency (TBD)",
    emoji: "🧠",
    status: "PLANNED",
    description: "Done-for-you AI automation agency for UK businesses",
    tagline: "Help SMEs integrate AI — inspired by AI Gorilla",
    stats: [
      { label: "Name", value: "TBD" },
    ],
    stages: [
      { name: "Name & Brand", status: "pending" },
      { name: "Website", status: "pending" },
      { name: "Service Packages", status: "pending" },
      { name: "First Client", status: "pending" },
    ],
    nextAction: "Pick a name — NorthAI is the top suggestion",
  },
  {
    id: "savvychef",
    name: "SavvyChef",
    emoji: "🍴",
    status: "IN DEVELOPMENT",
    url: "https://savvychef.co.uk",
    description: "Restaurant food cost comparison tool",
    tagline: "Compare wholesale prices across Brakes, Booker, JJ Foodservice",
    stages: [
      { name: "Price Comparison Built", status: "complete" },
      { name: "Weight Normalisation", status: "complete" },
      { name: "Domain Available", status: "complete", note: "savvychef.co.uk" },
      { name: "Domain Purchased", status: "pending" },
      { name: "Supermarket Data", status: "pending", note: "Tesco, Sainsburys, Asda via Trolley.co.uk" },
      { name: "Deploy & Launch", status: "pending" },
    ],
    nextAction: "Buy savvychef.co.uk (~£7 on Namecheap)",
  },
  {
    id: "delicious-deli",
    name: "Delicious Deli",
    emoji: "🥪",
    status: "ACTIVE",
    description: "Deli business managed via Jarvis AI assistant",
    tagline: "Supplier coordination, cost tracking, Uber Eats management",
    stages: [
      { name: "Jarvis Integration", status: "complete" },
      { name: "Booker Invoice Tracking", status: "complete" },
      { name: "Vimto Smoothie on Uber Eats", status: "pending", note: "Needs pricing + image" },
    ],
    nextAction: "Add Vimto Protein Smoothie to Uber Eats menu (£5.95, +£1 creatine modifier)",
  },
];

export function getStatusColor(status: BusinessStatus): string {
  switch (status) {
    case "LIVE": return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    case "ACTIVE": return "bg-green-500/20 text-green-400 border border-green-500/30";
    case "IN DEVELOPMENT": return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    case "PLANNED": return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    default: return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  }
}

export function getStatusDot(status: BusinessStatus): string {
  switch (status) {
    case "LIVE": return "bg-blue-400";
    case "ACTIVE": return "bg-green-400";
    case "IN DEVELOPMENT": return "bg-amber-400";
    case "PLANNED": return "bg-gray-400";
    default: return "bg-gray-400";
  }
}
