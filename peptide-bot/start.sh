#!/bin/bash
export OPENAI_API_KEY="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"
cd /Users/jarvis/.openclaw/workspace/peptide-bot
python3 bot.py >> bot.log 2>&1
