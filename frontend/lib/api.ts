// const API_BASE_URL = 'http://localhost:5000'  // Assuming Flask server runs on port 5000


// export async function resetChatHistory(): Promise<void> {
//   await fetch(`${API_BASE_URL}/reset-chat`, {
//     method: 'POST',
//   })
// }

export async function processURL(
  url: string,
  onUpdate: (type: string, data: any) => void
) {
  const response = await fetch("http://localhost:5000/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error("Processing failed");
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Save incomplete chunks

      lines.forEach((line) => {
        if (line.trim().startsWith("data:")) {
          const jsonString = line.trim().substring(5).trim(); // Remove "data:" prefix
          try {
            const parsed = JSON.parse(jsonString);
            onUpdate(parsed.type, parsed.result || parsed.error);
          } catch (err) {
            console.error("Failed to parse SSE line:", line, err);
          }
        }
      });
    }
  }
}
