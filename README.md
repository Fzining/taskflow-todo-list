# TaskFlow Todo List

TaskFlow is a responsive, installable PWA todo app built from the supplied desktop and mobile UI references.

## Run locally

```powershell
node dev-server.mjs
```

Open `http://localhost:4173`.

## Install

On Chrome, Edge, or Safari-compatible mobile browsers, open the app over `localhost` or HTTPS and choose the browser install option. The app includes a manifest and service worker, so it can be installed and used offline after first load.

## Current features

- Responsive desktop sidebar and mobile bottom navigation
- Today, Inbox, Upcoming, and Completed filters
- New task form
- Complete, duplicate, and delete tasks
- Search dialog
- List and board views
- Cross-device cloud sync through Vercel Blob, with local offline fallback
- Offline app shell through a service worker
