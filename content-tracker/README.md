# Content Tracker

An automation, a workflow that runs on a schedule, that turns posting into data you can act on. Every day it pulls your best-performing content into one sheet and hands it to an AI to break down what's working.

## What it does

1. **Pulls your content + its metrics** from your ad/content library (built on Foreplay, or your own source) every day.
2. **Writes each piece to one Google Sheet**: hook, transcript, caption, thumbnail, and the numbers (views, retention, reach).
3. **Hands the sheet to an LLM** that breaks down what's working: which hooks, which topics, which formats.
4. **Runs on a schedule**, so the sheet is current every morning without you touching it.

## How to build it

You can run this on n8n, Make, or Gumloop. The shape is the same:

1. **Trigger:** schedule (daily).
2. **Source node:** pull your saved content + metrics (Foreplay board export, or your platform's API).
3. **Transform:** map each item to columns — hook, transcript, caption, thumbnail URL, video URL, metrics.
4. **Sheet node:** append rows to a Google Sheet.
5. **LLM node:** feed the sheet (or the new rows) to a model with a prompt that ranks what performed and why.
6. **Output:** write the breakdown back to a second tab, or send it to Slack/email.

## Notes

- The value is the daily cadence: you are building a dataset of what works in your niche, not guessing.
- Pair it with the voice setup so the winning patterns get written back in your voice.
- This is the giveaway tracker. It is not the proprietary content-intelligence system.
