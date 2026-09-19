# Signal / Device Inspector

A local-first React/Vite dashboard for browser-visible device and storage telemetry.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (configured for port 5175).

## Browser capabilities

The app uses standard browser APIs for platform, display, network, memory hints, CPU hints, and browser storage quota. USB enumeration uses WebUSB and requires a secure context plus explicit user permission, so it works best in Chrome or Edge on `localhost` or HTTPS.

For files, use **Open USB folder** and choose the drive as it appears in the operating system. The File System Access API then allows this app to list files, read and edit text files, preview images, play audio/video files directly, and copy any file type from the computer to the USB drive after you grant read/write permission. Browsers still do not expose a generic USB device's raw sectors or reliable total capacity; those require a native app or a device-specific USB protocol.
