# Node Video Share

A lightweight video sharing service for local development/testing.

## Features

- HTTP/HTTPS support with automatic cross-origin isolation
- Range requests for optimized video streaming
- Quick video link access via console output and web page
- Secure path handling to prevent directory traversal

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Access videos at: `http://localhost:3000/videos/yourvideo.mp4`
View video list at: `http://localhost:3000/videos.html`

## Configuration

Edit `config.json` to customize port, HTTPS settings, and video directory.
