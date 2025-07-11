This is my desktop movie application project called Chilly Movies, developed over several months with the help of AI and AI agents. The frontend UI is a completed, production-ready template I initially designed using Google Firebase Studio, which lets you generate full web apps through AI-assisted workflows. The app uses the TMDB API to fetch metadata for movies and TV shows, including trailers.

Core Functionalities (Must Be Implemented Fully – No Placeholders):
Movie & TV Series Downloading

Integrate YTS API for torrent-based movie downloads.

Use WebTorrent for torrent streaming and downloading directly within the app.

For TV series, support:

Downloading individual episodes

Downloading an entire season

Downloading all seasons

Allow user to choose quality (e.g., 480p, 720p, 1080p, etc.)

YouTube Support

Allow downloading of YouTube videos and audios

Integrate YouTube metadata fetching (title, thumbnail, etc.)

Support various output formats: MP3, MP4, WebM

Live Search

Implement real-time search across all media

Support both Swahili and English inputs (i18n-ready)

Ensure fast fuzzy search using indexed queries or a proper search engine (optional)

Trailer Viewing

From TMDB data, allow users to watch official trailers inside the app.

Stream the trailer using embedded players or with a fallback to YouTube.

Online Playback

Add a button to stream/play online using WebTorrent or direct links when available.

Support caching or progressive streaming.

Multilingual Support

UI must support Swahili and English

All content (UI, errors, system messages) should adapt to selected language

Pages To Cover
Go through every page and ensure all components are implemented and functional:

MainPage

MoviesPage

TVSeriesPage

DownloadsPage

YouTubePage

SettingsPage

Instructions
Eliminate all placeholders, mocks, or dummy data.

Implement actual logic behind every UI component.

Handle errors, edge cases, and typos.

Confirm all API endpoints (YTS, TMDB, YouTube, WebTorrent) are properly integrated and rate-limit safe.

Ensure responsive design and desktop UX polish.

Packaging
This is intended as a desktop application (Windows-first). Package it using Electron, but if there's a better tool or modern alternative, feel free to switch. The final output should be a setup executable (.exe) that installs and launches the app smoothly.

Bonus: Optional Features
If time/logic permits, support:

Download queue management

Download speed display

Pause/resume torrents

Dark mode toggle

Recent/watchlist tracking

This version is modular and scalable. You can hand this prompt to any agent or developer and they will understand:

The purpose

The methods and tools used

The current state

What exactly needs to be done, and how.