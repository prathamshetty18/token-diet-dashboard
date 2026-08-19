# Context Weaver

Role: Act as an expert Full-Stack Developer and UI/UX Designer.

Task: Build a functional, modern web dashboard for a Generative AI project called "Token-Diet Dynamic Context Compressor." This is a post-retrieval optimization pipeline for RAG (Retrieval-Augmented Generation) systems.

Core Concept: The app simulates taking a large paragraph of text retrieved from a database, scoring the sentences, stripping out the useless filler/fluff, and passing only the dense, semantic sentences to the LLM.

UI Layout & Features Needed:

Header/Title: "Smart Context Compression Dashboard" with a brief subtitle explaining it saves LLM tokens and reduces latency.

Input Section:

A text input field for the "User Query".

A large text area for the "Raw Retrieved RAG Context" (with some dummy text pre-filled).

A button labeled "Compress Context & Generate".

Metrics/KPI Cards (Visual Anchor): A prominent metrics row at the top displaying:

Context Compression Ratio: (e.g., 70% tokens saved).

Latency Drop: (e.g., -450 ms).

Original Token Count vs. New Token Count.

Comparison View (Two-Column Layout):

Left Column (Traditional RAG): Shows the massive original text block with a simulated "slow" loading time to first token.

Right Column (Token-Diet RAG): Shows the newly compressed, dense text with a simulated "fast" loading time. Highlight the retained sentences in green or bold.

Technical Constraints:

Please write the code using [Insert Framework: e.g., Streamlit / Next.js with Tailwind CSS / React].

Make the UI look modern, clean, and data-focused. Include mock data or simple logic to simulate the compression math (e.g., randomly reducing text length by 50-70% when the button is clicked) so the dashboard is immediately interactive.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://token-diet-dashboard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/87a5d6fc-2abb-419b-a6e6-4995ea94e504).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
