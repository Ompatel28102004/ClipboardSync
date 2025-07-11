const SERVER_IP = "https://clipsync-qhc1.onrender.com";
let socket;
let copiedHistory = [];
let showHistory = false;
let lastClipboardContent = "";
let isPollingPaused = false;

async function getUserIP() {
  try {
    const localIP = await window.electronAPI.getLocalIP();
    return localIP;
  } catch (error) {
    console.error("Error getting local IP:", error);
    return "unknown";
  }
}

console.log("Connecting to server:", SERVER_IP);

async function initializeSocket() {
  const userIP = await getUserIP();

  socket = io(SERVER_IP, {
    query: { userIP },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
    document.getElementById("status").innerText = "🟢 Connected";
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    document.getElementById("status").innerText = "🔴 Connection error";
  });

  socket.on("receive-message", (data) => {
    if (typeof data === 'string') {
      updateClipboardContent(data);
    } else if (data.type === 'text') {
      updateClipboardContent(data.content);
    }
  });

  setInterval(async () => {
    if (isPollingPaused) return;

    try {
      const text = await window.electronAPI.readClipboard();
      if (text && text !== lastClipboardContent && text.trim()) {
        lastClipboardContent = text;
        await updateClipboardContent(text);
        socket.emit("sendMessage", { type: 'text', content: text });
      }
    } catch (error) {
      console.error("Clipboard error:", error);
    }
  }, 1000);
}

async function updateClipboardContent(content) {
  copiedHistory = [content, ...copiedHistory];
  updateHistory();
  lastClipboardContent = content;
  await window.electronAPI.writeClipboard(content);
}

function updateHistory() {
  const historyItems = document.getElementById("historyItems");
  historyItems.innerHTML = copiedHistory
    .map((item, index) => {
      return createTextHistoryItem(
        typeof item === 'string' ? item : item.content,
        index
      );
    })
    .join("");
}

function createTextHistoryItem(text, index) {
  return `
    <div class="history-item">
      <span>${text}</span>
      <button class="copy-btn" onclick="copyHistoryItem(${index})">Copy</button>
    </div>
  `;
}

window.copyHistoryItem = async (index) => {
  const content = copiedHistory[index];
  if (content) {
    const text = typeof content === 'string' ? content : content.content;
    await updateClipboardContent(text);
    socket.emit("sendMessage", { type: 'text', content: text });

    document.getElementById("status").innerText = "✅ Copied!";
    setTimeout(() => {
      document.getElementById("status").innerText = "🟢 Connected";
    }, 2000);
  }
};

window.toggleHistory = () => {
  showHistory = !showHistory;
  const historySection = document.getElementById("historySection");
  const historyBtn = document.getElementById("historyBtn");
  historySection.style.display = showHistory ? "block" : "none";
  historyBtn.innerText = showHistory ? "Close History" : "View copied content";
  historyBtn.style.backgroundColor = showHistory ? "orange" : "";
};

window.resetContent = async () => {
  isPollingPaused = true;
  lastClipboardContent = "";
  copiedHistory = [];
  updateHistory();
  await window.electronAPI.writeClipboard("");
  setTimeout(() => {
    isPollingPaused = false;
  }, 100);
};

initializeSocket().catch((error) => {
  console.error("Socket initialization error:", error);
  document.getElementById("status").innerText = "🔴 Initialization error";
});
