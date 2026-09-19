import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronRight,
  CircleHelp,
  Cpu,
  FileText,
  FolderOpen,
  HardDrive,
  Laptop,
  MemoryStick,
  Monitor,
  Music2,
  RefreshCw,
  Save,
  ShieldCheck,
  Usb,
  Upload,
  Wifi,
  X,
} from "lucide-react";

const EMPTY_DEVICE = {
  name: "",
  vendor: "",
  productId: "",
  vendorId: "",
  serial: "",
  version: "",
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unavailable";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function getPlatform() {
  const userAgentData = navigator.userAgentData;
  if (userAgentData?.platform) return userAgentData.platform;
  return navigator.platform || "Unknown platform";
}

function getBrowser() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Google Chrome";
  if (userAgent.includes("Firefox/")) return "Mozilla Firefox";
  if (userAgent.includes("Safari/")) return "Safari";
  return "Browser";
}

function getDeviceName(platform) {
  if (/android/i.test(platform)) return "Android device";
  if (/iphone|ipad|ios/i.test(platform)) return "Apple mobile device";
  if (/mac/i.test(platform)) return "Mac";
  if (/win/i.test(platform)) return "Windows PC";
  if (/linux/i.test(platform)) return "Linux computer";
  return "Connected computer";
}

function getFileKind(name, type = "") {
  const normalizedType = type.toLowerCase();
  const extension = name.split(".").pop()?.toLowerCase();
  if (
    normalizedType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension)
  )
    return "image";
  if (
    normalizedType.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(extension)
  )
    return "audio";
  if (
    normalizedType.startsWith("video/") ||
    ["mp4", "webm", "mov", "m4v", "avi"].includes(extension)
  )
    return "video";
  if (
    normalizedType.startsWith("text/") ||
    ["txt", "md", "json", "csv", "html", "css", "js"].includes(extension)
  )
    return "text";
  return "binary";
}

function Stat({ icon: Icon, label, value, detail }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div>
        <p className="eyebrow">{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

function DataRow({ label, value, muted = false }) {
  return (
    <div className="data-row">
      <span>{label}</span>
      <strong className={muted ? "muted" : ""}>{value}</strong>
    </div>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [usbDevice, setUsbDevice] = useState(null);
  const [usbMessage, setUsbMessage] = useState("No USB device paired yet");
  const [usbError, setUsbError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usbDirectory, setUsbDirectory] = useState(null);
  const [usbFiles, setUsbFiles] = useState([]);
  const [selectedUsbFile, setSelectedUsbFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileMessage, setFileMessage] = useState("");
  const [isFileBusy, setIsFileBusy] = useState(false);
  const [selectedFileUrl, setSelectedFileUrl] = useState("");
  const uploadInputRef = useRef(null);

  const refreshSnapshot = async () => {
    setIsRefreshing(true);
    const platform = getPlatform();
    let storage = null;
    if (navigator.storage?.estimate) {
      storage = await navigator.storage.estimate();
    }
    setSnapshot({
      platform,
      deviceName: getDeviceName(platform),
      browser: getBrowser(),
      cores: navigator.hardwareConcurrency || null,
      memory: navigator.deviceMemory || null,
      language: navigator.language || "Unknown",
      online: navigator.onLine,
      screen: `${window.screen.width} x ${window.screen.height}`,
      pixelRatio: window.devicePixelRatio || 1,
      connection: navigator.connection?.effectiveType || "Not reported",
      storage,
      secure: window.isSecureContext,
      timestamp: new Date(),
    });
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshSnapshot();
    const handleOnline = () => refreshSnapshot();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOnline);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (selectedFileUrl) URL.revokeObjectURL(selectedFileUrl);
    };
  }, [selectedFileUrl]);

  const storagePercent = useMemo(() => {
    if (!snapshot?.storage?.quota || !snapshot.storage.usage) return 0;
    return Math.min(
      (snapshot.storage.usage / snapshot.storage.quota) * 100,
      100,
    );
  }, [snapshot]);

  const connectUsb = async () => {
    setUsbError("");
    if (!navigator.usb) {
      setUsbError(
        "WebUSB is not available in this browser. Try Chrome or Edge on a secure origin.",
      );
      return;
    }
    try {
      const device = await navigator.usb.requestDevice({ filters: [] });
      setUsbDevice(device);
      setUsbMessage("USB device authorized for this site");
    } catch (error) {
      if (error.name !== "NotFoundError")
        setUsbError(error.message || "USB permission was not granted.");
    }
  };

  const refreshUsbFiles = async (directory) => {
    const files = [];
    for await (const [name, handle] of directory.entries()) {
      if (handle.kind !== "file") continue;
      const file = await handle.getFile();
      files.push({
        name,
        size: file.size,
        type: file.type || "Unknown type",
        handle,
      });
    }
    files.sort((first, second) => first.name.localeCompare(second.name));
    setUsbFiles(files);
    return files;
  };

  const chooseUsbStorage = async () => {
    setFileMessage("");
    if (!window.showDirectoryPicker) {
      setFileMessage(
        "Folder access is not available here. Use Chrome or Edge on localhost or HTTPS.",
      );
      return;
    }
    try {
      const directory = await window.showDirectoryPicker({ mode: "readwrite" });
      const permission = await directory.requestPermission({
        mode: "readwrite",
      });
      if (permission !== "granted") {
        setFileMessage("Read/write permission was not granted.");
        return;
      }
      setUsbDirectory(directory);
      const files = await refreshUsbFiles(directory);
      setSelectedUsbFile(files[0] || null);
      setFileContent("");
      setSelectedFileUrl("");
      setFileMessage(`${directory.name} is ready for read/write access.`);
    } catch (error) {
      if (error.name !== "AbortError")
        setFileMessage(error.message || "The USB folder could not be opened.");
    }
  };

  const readUsbFile = async (fileEntry) => {
    setIsFileBusy(true);
    setFileMessage("");
    try {
      const file = await fileEntry.handle.getFile();
      setSelectedUsbFile(fileEntry);
      setSelectedFileUrl(URL.createObjectURL(file));
      const kind = getFileKind(fileEntry.name, file.type);
      setFileContent(kind === "text" ? await file.text() : "");
      setFileMessage(`Loaded ${fileEntry.name} successfully.`);
    } catch (error) {
      setFileMessage(error.message || "This file could not be read as text.");
    } finally {
      setIsFileBusy(false);
    }
  };

  const uploadFileToUsb = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !usbDirectory) return;
    setIsFileBusy(true);
    setFileMessage("");
    try {
      const handle = await usbDirectory.getFileHandle(file.name, {
        create: true,
      });
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      const files = await refreshUsbFiles(usbDirectory);
      const uploadedFile = files.find((entry) => entry.name === file.name);
      if (uploadedFile) await readUsbFile(uploadedFile);
      setFileMessage(`Copied ${file.name} to the USB drive.`);
    } catch (error) {
      setFileMessage(
        error.message || "The file could not be copied to the USB drive.",
      );
    } finally {
      setIsFileBusy(false);
    }
  };

  const writeUsbFile = async () => {
    if (!usbDirectory) return;
    setIsFileBusy(true);
    setFileMessage("");
    try {
      const handle = await usbDirectory.getFileHandle("signal-note.txt", {
        create: true,
      });
      const writable = await handle.createWritable();
      await writable.write(fileContent);
      await writable.close();
      const files = await refreshUsbFiles(usbDirectory);
      setSelectedUsbFile(
        files.find((file) => file.name === "signal-note.txt") || null,
      );
      setFileMessage("Wrote signal-note.txt to the selected USB folder.");
    } catch (error) {
      setFileMessage(error.message || "The file could not be written.");
    } finally {
      setIsFileBusy(false);
    }
  };

  const disconnectUsb = () => {
    setUsbDevice(null);
    setUsbMessage("No USB device paired yet");
    setUsbError("");
  };

  const device = snapshot || {
    deviceName: "Detecting device",
    platform: "Checking system",
    browser: "Checking browser",
    online: true,
  };
  const selectedFileKind = selectedUsbFile
    ? getFileKind(selectedUsbFile.name, selectedUsbFile.type)
    : "text";

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Activity size={20} />
          </div>
          <div>
            <strong>signal</strong>
            <span>device inspector</span>
          </div>
        </div>
        <div className="topbar-status">
          <span className="status-dot" /> Live local scan{" "}
          <span className="divider" /> {device.browser}
        </div>
      </header>

      <main className="page-shell">
        <section className="hero">
          <div>
            <p className="kicker">
              LOCAL HARDWARE TELEMETRY <span>01</span>
            </p>
            <h1>
              Know what’s
              <br />
              <em>connected.</em>
            </h1>
            <p className="hero-copy">
              A private, in-browser readout of the machine running this app. No
              account, upload, or backend required.
            </p>
          </div>
          <div className="scan-orbit" aria-hidden="true">
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="orbit-core">
              <Activity size={30} />
            </div>
            <span className="orbit-label">
              SCAN
              <br />
              ACTIVE
            </span>
          </div>
        </section>

        <section className="device-banner">
          <div className="device-heading">
            <div className="device-icon">
              <Laptop size={27} />
            </div>
            <div>
              <p className="eyebrow">CURRENT HOST</p>
              <h2>{device.deviceName}</h2>
              <p>
                {device.platform} <span className="bullet">•</span>{" "}
                {device.online ? "Online" : "Offline"}
              </p>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={refreshSnapshot}
            aria-label="Refresh device data"
            title="Refresh device data"
          >
            <RefreshCw size={18} className={isRefreshing ? "spin" : ""} />
          </button>
        </section>

        <div className="stat-grid">
          <Stat
            icon={Cpu}
            label="Processor"
            value={
              device.cores ? `${device.cores} logical cores` : "Not reported"
            }
            detail="Browser-reported capacity"
          />
          <Stat
            icon={MemoryStick}
            label="Memory hint"
            value={device.memory ? `${device.memory} GB` : "Not reported"}
            detail="Approximate device RAM"
          />
          <Stat
            icon={Monitor}
            label="Display"
            value={device.screen || "Not reported"}
            detail={
              device.pixelRatio
                ? `${device.pixelRatio}x pixel density`
                : "Screen details"
            }
          />
          <Stat
            icon={Wifi}
            label="Network"
            value={device.connection || "Not reported"}
            detail={
              device.language
                ? `${device.language} locale`
                : "Connection quality"
            }
          />
        </div>

        <div className="content-grid">
          <section className="panel host-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">
                  HOST PROFILE <span>02</span>
                </p>
                <h2>System details</h2>
              </div>
              <ShieldCheck size={22} />
            </div>
            <div className="data-list">
              <DataRow
                label="Operating environment"
                value={device.platform || "Detecting..."}
              />
              <DataRow
                label="Browser engine"
                value={device.browser || "Detecting..."}
              />
              <DataRow
                label="Preferred language"
                value={device.language || "Not reported"}
              />
              <DataRow
                label="Screen resolution"
                value={device.screen || "Not reported"}
              />
              <DataRow
                label="Secure context"
                value={
                  snapshot ? (snapshot.secure ? "Yes" : "No") : "Checking..."
                }
              />
            </div>
            <div className="privacy-note">
              <ShieldCheck size={16} />
              <span>
                All readings stay in this tab. Nothing is sent to a server.
              </span>
            </div>
          </section>

          <section className="panel storage-panel">
            <div className="panel-heading">
              <div>
                <p className="kicker">
                  BROWSER STORAGE <span>03</span>
                </p>
                <h2>Memory footprint</h2>
              </div>
              <HardDrive size={22} />
            </div>
            <div className="storage-number">
              <strong>{formatBytes(snapshot?.storage?.usage)}</strong>
              <span>used by this origin</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <div className="storage-meta">
              <span>
                {storagePercent
                  ? `${storagePercent.toFixed(1)}% used`
                  : "Usage not exposed"}
              </span>
              <strong>
                {formatBytes(snapshot?.storage?.quota)} available quota
              </strong>
            </div>
            <div className="info-callout">
              <CircleHelp size={16} />
              <span>
                This is browser storage, not the computer’s total disk. Browsers
                intentionally do not expose full disk capacity to web pages.
              </span>
            </div>
          </section>
        </div>

        <section className="panel usb-panel">
          <div className="panel-heading usb-heading">
            <div>
              <p className="kicker">
                PERIPHERAL LINK <span>04</span>
              </p>
              <h2>USB devices</h2>
              <p className="panel-subtitle">
                Authorize a device to read the identifiers your browser makes
                available.
              </p>
            </div>
            <div className="usb-badge">
              <Usb size={18} /> WebUSB
            </div>
          </div>
          {usbDevice ? (
            <div className="usb-connected">
              <div className="usb-device-visual">
                <Usb size={29} />
                <span className="connected-check">
                  <Check size={13} />
                </span>
              </div>
              <div className="usb-device-details">
                <div className="connected-label">
                  <span className="status-dot" /> Connected
                </div>
                <h3>{usbDevice.productName || "Unnamed USB device"}</h3>
                <p>
                  {usbDevice.manufacturerName || "Manufacturer unavailable"}{" "}
                  <span className="bullet">•</span> {usbMessage}
                </p>
              </div>
              <div className="usb-data">
                <DataRow
                  label="Vendor ID"
                  value={
                    usbDevice.vendorId
                      ? `0x${usbDevice.vendorId.toString(16).padStart(4, "0")}`
                      : "Unavailable"
                  }
                />
                <DataRow
                  label="Product ID"
                  value={
                    usbDevice.productId
                      ? `0x${usbDevice.productId.toString(16).padStart(4, "0")}`
                      : "Unavailable"
                  }
                />
              </div>
              <button className="secondary-button" onClick={disconnectUsb}>
                <X size={16} /> Disconnect
              </button>
            </div>
          ) : (
            <div className="usb-empty">
              <div className="empty-icon">
                <Usb size={24} />
              </div>
              <div>
                <h3>{usbMessage}</h3>
                <p>
                  {usbError ||
                    "Plug in a USB device, then authorize it to see its name, vendor, product ID, and USB version."}
                </p>
              </div>
              <button className="primary-button" onClick={connectUsb}>
                <Usb size={17} /> Scan for USB
              </button>
            </div>
          )}
          <div className="usb-footnote">
            <AlertCircle size={15} />
            <span>
              Generic web pages cannot inspect a USB drive’s filesystem or total
              capacity. That requires a native app or a device-specific WebUSB
              protocol.
            </span>
            <ChevronRight size={15} />
          </div>
        </section>

        <section className="panel file-panel">
          <div className="panel-heading file-heading">
            <div>
              <p className="kicker">
                FILE ACCESS <span>05</span>
              </p>
              <h2>Read &amp; write files</h2>
              <p className="panel-subtitle">
                Select the mounted USB folder to work with its files directly.
              </p>
            </div>
            <div className="usb-badge">
              <FolderOpen size={17} /> File System Access
            </div>
          </div>
          {!usbDirectory ? (
            <div className="file-empty">
              <div className="empty-icon">
                <FolderOpen size={24} />
              </div>
              <div>
                <h3>Choose your USB drive folder</h3>
                <p>
                  This opens the drive mounted by your operating system. You
                  decide which folder the app can read and write.
                </p>
              </div>
              <button className="primary-button" onClick={chooseUsbStorage}>
                <FolderOpen size={17} /> Open USB folder
              </button>
            </div>
          ) : (
            <div className="file-workspace">
              <div className="file-sidebar">
                <div className="file-drive-title">
                  <FolderOpen size={17} /> {usbDirectory.name}
                </div>
                <div className="file-count">{usbFiles.length} files found</div>
                <div className="file-list">
                  {usbFiles.length ? (
                    usbFiles.map((file) => (
                      <button
                        className={`file-row ${selectedUsbFile?.name === file.name ? "selected" : ""}`}
                        key={file.name}
                        onClick={() => readUsbFile(file)}
                      >
                        <FileText size={15} />
                        <span>{file.name}</span>
                        <small>{formatBytes(file.size)}</small>
                      </button>
                    ))
                  ) : (
                    <span className="file-list-empty">
                      No files in this folder.
                    </span>
                  )}
                </div>
              </div>
              <div className="file-editor">
                <div className="editor-label">
                  <span>{selectedUsbFile?.name || "New text file"}</span>
                  <span>{selectedUsbFile ? selectedUsbFile.type : "TXT"}</span>
                </div>
                {selectedFileKind === "image" && selectedFileUrl ? (
                  <div className="media-preview image-preview">
                    <img src={selectedFileUrl} alt={selectedUsbFile.name} />
                  </div>
                ) : null}
                {selectedFileKind === "audio" && selectedFileUrl ? (
                  <div className="media-preview audio-preview">
                    <Music2 size={28} />
                    <audio controls src={selectedFileUrl}>
                      Your browser cannot play this audio file.
                    </audio>
                  </div>
                ) : null}
                {selectedFileKind === "video" && selectedFileUrl ? (
                  <div className="media-preview video-preview">
                    <video controls src={selectedFileUrl}>
                      Your browser cannot play this video file.
                    </video>
                  </div>
                ) : null}
                {selectedFileKind === "text" ? (
                  <textarea
                    value={fileContent}
                    onChange={(event) => setFileContent(event.target.value)}
                    placeholder="Read a text file or write a note to your USB drive..."
                    disabled={isFileBusy}
                  />
                ) : null}
                {selectedFileKind === "binary" ? (
                  <div className="binary-preview">
                    <FileText size={30} />
                    <strong>{selectedUsbFile?.name}</strong>
                    <span>
                      This file type can be copied safely, but cannot be edited
                      in the browser.
                    </span>
                    {selectedFileUrl ? (
                      <a href={selectedFileUrl} download={selectedUsbFile.name}>
                        Download / open file
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <div className="editor-actions">
                  <span>
                    {fileMessage ||
                      (selectedFileKind === "text"
                        ? "Text files can be read and saved here."
                        : "Click another file to preview it.")}
                  </span>
                  <div className="editor-buttons">
                    <button
                      className="secondary-button"
                      onClick={() => uploadInputRef.current?.click()}
                      disabled={isFileBusy}
                    >
                      <Upload size={16} /> Copy file to USB
                    </button>
                    {selectedFileKind === "text" ? (
                      <button
                        className="primary-button"
                        onClick={writeUsbFile}
                        disabled={isFileBusy}
                      >
                        <Save size={16} /> Save text
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={uploadInputRef}
                  className="visually-hidden"
                  type="file"
                  onChange={uploadFileToUsb}
                />
              </div>
            </div>
          )}
          <div className="usb-footnote">
            <AlertCircle size={15} />
            <span>
              File access works with a USB drive mounted by Windows, macOS, or
              Linux. A raw USB device that has no mounted filesystem needs a
              native or device-specific tool.
            </span>
            <ChevronRight size={15} />
          </div>
        </section>

        <footer>
          <span>LOCAL SCAN COMPLETE</span>
          <span>
            {snapshot
              ? `Last updated ${snapshot.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Reading sensors..."}
          </span>
          <span>Signal / v1.0</span>
        </footer>
      </main>
    </div>
  );
}
