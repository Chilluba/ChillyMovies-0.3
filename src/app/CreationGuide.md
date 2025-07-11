# Creation Guide

This template provides a clean, responsive, and internationalized UI. All download and streaming backend logic has been stubbed out, leaving the frontend ready for your custom implementations.



Modularity: Keep new features self-contained as much as possible. For instance, a "download manager" service could handle all download logic, and UI components would interact with this service.

Separation of Concerns:

UI Components (/src/components/features/): Should primarily focus on presentation and user interaction. They trigger actions and display data.

Logic/Services (/src/lib/ or new /src/services/): Encapsulate the actual feature logic (e.g., API calls, data processing, state management interactions).

API Routes (/src/app/api/) or External Backend: Handle server-side tasks if your feature requires a backend (e.g., initiating downloads via a server-side tool like Aria2, fetching sensitive data).

Client vs. Server Components: Understand Next.js App Router conventions. UI interactivity often requires Client Components ("use client"). Data fetching can often be done in Server Components or Route Handlers.

State Management:

For simple local state, useState and useEffect are fine.

For state shared across multiple components (e.g., download progress, global settings), consider React Context or a lightweight state management library if needed. The existing WebTorrentContext.tsx (now stubbed) could be a model for a DownloadManagerContext.tsx.

Error Handling: Implement robust error handling at each layer (API calls, data processing, UI display) and provide user-friendly feedback using toasts (via useToast) or inline messages.

Internationalization (i18n): All user-facing text should go into the dictionary files (/src/dictionaries/en.json, /src/dictionaries/sw.json). Use the getDictionary function and pass the dictionary object to your components.

Let's assume you want to implement a feature where clicking a "Download" button on a movie page initiates a download using a backend service.



Step A: Backend/API (If Applicable)



If your download mechanism involves a backend (e.g., sending a magnet link to a server running Aria2):



Define the API Endpoint: Create or uncomment an API route (e.g., src/app/api/download/route.ts or an endpoint on your separate Express server if you're using the src/server/ structure).

This endpoint would accept parameters like magnetLink, title, type, etc.

It would interact with your download tool (Aria2, server-side WebTorrent).

It should return a success/failure response, perhaps with a task ID.

Implement Backend Logic: Write the Node.js code to handle the download request (e.g., in src/server/index.ts and src/server/webtorrentManager.ts if you reactivate that, or your separate server).

Step B: Frontend Integration



Identify the UI Trigger: Find the component where the action starts (e.g., src/components/features/movies/MovieClientContent.tsx if a "Download" button is there, or you might re-add a MovieDownloadCard.tsx).

Create an Action Handler:

In the relevant component (e.g., MovieClientContent.tsx), modify or add an async function (e.g., handleDownloadMovie).

This function will:

Gather necessary data (movie ID, title, magnet link if available from movie prop).

Make a fetch request to your backend API endpoint (or directly interact with a client-side library if the download is purely browser-based, like client-side WebTorrent).

Include appropriate headers (e.g., Content-Type: 'application/json', API keys if needed).

Handle the API response:

Show a success toast (toast({ title: "Download Started", ... })).

Show an error toast if the API call fails or returns an error.

Optionally, update local state to reflect the download has started (e.g., to show progress later).

Wire up the Button: Attach this handleDownloadMovie function to the onClick handler of the "Download" button.

Update Component Props: Ensure the component receives all necessary data (e.g., movie.magnetLink, movie.imdb\_id) through its props.

Step C: State Management for Progress (Example)



If you want to show download progress on the Downloads page:



Context (Recommended for Shared State):

Create a DownloadManagerContext.tsx (similar to how WebTorrentContext.tsx was structured).

This context would provide:

A list of active downloads (activeDownloads).

Functions to addDownloadTask(taskInfo), updateDownloadProgress(taskId, progressInfo), removeDownloadTask(taskId).

It might internally poll a backend status endpoint or listen to events from a client-side download library.

Downloads Page (src/app/[locale]/(main)/downloads/page.tsx):

Consume the DownloadManagerContext.

Map over activeDownloads to display each item's progress, speed, etc.

The UI for displaying individual download items is already partially stubbed out.

Step D: UI Updates & Feedback



Loading States: Disable download buttons and show a loader (Loader2Icon) while the initial API call is in progress.

Progress Display: Use the <Progress /> component (already in shadcn/ui) to show download progress.

Error Messages: Clearly display errors from the download process.

Component Logic:

src/components/features/movies/MovieClientContent.tsx (for movie-specific actions)

src/components/features/tv-series/TVSeriesClientContent.tsx (for series-level actions)

src/components/features/tv-series/SeasonAccordionItem.tsx (for episode/season actions)

src/app/[locale]/(main)/youtube-downloader/page.tsx (for YouTube actions)

You might re-introduce components like MovieDownloadCard.tsx or create new ones like EpisodeDownloadButton.tsx.

API Routes (Next.js Route Handlers):

src/app/api/... (for serverless functions that Next.js can host)

Standalone Backend Server (If you keep the src/server/ structure):

src/server/index.ts (Express routes)

src/server/webtorrentManager.ts (or your custom download logic module)

Shared Logic/Utilities:

src/lib/tmdb.ts (if you need to fetch more specific data like magnet links before initiating a download)

Create new files in src/lib/ or src/services/ for new helper functions or service classes.

State Management:

Consider creating new context files in src/contexts/ (e.g., DownloadManagerContext.tsx).

Types:

src/types/download.ts (define types for your download tasks, progress, etc.)

src/types/tmdb.ts (if you need to extend TMDB types with download-related info).

Dictionaries:

src/dictionaries/en.json & src/dictionaries/sw.json (for all new user-facing text).

Leverage ShadCN UI: Use existing components from /src/components/ui/ (Button, Card, Dialog, Select, Progress, Toast, etc.) for new UI elements. This ensures visual consistency.

Tailwind CSS: Use Tailwind utility classes for styling and layout, following the patterns in existing components.

Icons: Use lucide-react icons.

Responsiveness: Test your new UI elements on different screen sizes.

Dark Theme: The app uses a dark theme by default. Ensure your new components look good in this theme.

Spacing and Layout: Follow the existing spacing and layout conventions (e.g., padding in cards, gaps between elements).

Incremental Testing: Test each part of your feature as you build it (backend endpoint, frontend API call, UI update).

Error Cases: Test how your feature handles errors (invalid input, API failures, network issues).

Cross-Browser/Device (if applicable): While this is a template, keep basic cross-browser compatibility in mind.

By following these guidelines, you can systematically add new features like downloading to this UI template, making it a fully functional application. Start small with one specific download type (e.g., movie download via backend) and build from there. Good luck!