import { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSocket } from "../components/SocketProvider";

export default function Index() {
  const [copiedItem, setCopiedItem] = useState(null);
  const [copiedHistory, setCopiedHistory] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [lastClipboardContent, setLastClipboardContent] = useState(null);

  const { socket } = useSocket();

  // Monitor clipboard for new text
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await Clipboard.getStringAsync();
        if (text && text !== lastClipboardContent) {
          setCopiedItem(text);
          setCopiedHistory((prev) => [
            { content: text, timestamp: Date.now() },
            ...prev,
          ]);
          setLastClipboardContent(text);

          if (socket) {
            socket.emit("sendMessage", { type: "text", content: text });
          }
        }
      } catch (error) {
        console.error("Clipboard check error:", error);
      }
    };

    const intervalId = setInterval(checkClipboard, 2000);
    return () => clearInterval(intervalId);
  }, [lastClipboardContent, socket]);

  // Receive text from other devices
  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      console.log("Received from another device:", data);
      const text = typeof data === "string" ? data : data.content;
      if (text !== lastClipboardContent) {
        handleIncomingText(text);
      }
    };

    socket.on("receive-message", handler);
    return () => socket.off("receive-message", handler);
  }, [socket, lastClipboardContent]);

  const handleIncomingText = async (text) => {
    setCopiedItem(text);
    setCopiedHistory((prev) => [
      { content: text, timestamp: Date.now() },
      ...prev,
    ]);
    setLastClipboardContent(text);
    await Clipboard.setStringAsync(text);
  };

  const copyToClipboard = async () => {
    if (!inputText.trim()) return;

    await Clipboard.setStringAsync(inputText);
    if (socket) {
      socket.emit("sendMessage", { type: "text", content: inputText });
    }
    handleIncomingText(inputText);
    setInputText("");
  };

  const resetContent = async () => {
    setCopiedItem(null);
    setInputText("");
    setShowHistory(false);
    setLastClipboardContent(null);
    setCopiedHistory([]);
    try {
      await Clipboard.setStringAsync("");
    } catch (err) {
      console.error("Clipboard clear error:", err);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <TextInput
          style={styles.textInput}
          onChangeText={setInputText}
          value={inputText}
          placeholder="Type something to copy"
          multiline
        />
        <View style={styles.buttonContainer}>
          <Button
            title="Copy to Clipboard"
            onPress={copyToClipboard}
            disabled={!inputText.trim()}
          />
          <Button
            title={showHistory ? "Close History" : "View History"}
            onPress={() => setShowHistory((prev) => !prev)}
            color={showHistory ? "orange" : "blue"}
          />
          <Button title="Reset" onPress={resetContent} color="red" />
        </View>

        {showHistory && copiedHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyHeader}>Copy History:</Text>
            {copiedHistory.map((item, index) => (
              <View key={index} style={styles.historyTextContainer}>
                <Text style={styles.historyItem} selectable>
                  {item.content}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  scrollView: {
    flexGrow: 1,
    alignItems: "center",
  },
  textInput: {
    width: "100%",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    minHeight: 60,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 16,
  },
  historyContainer: {
    width: "100%",
    marginTop: 20,
  },
  historyHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  historyTextContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  historyItem: {
    color: "#333",
    fontSize: 14,
  },
});
