import { Summary, RelatedArticle, ChatMessage } from './types'

const API_BASE_URL = 'http://localhost:5000'  // Assuming Flask server runs on port 5000

function simulateRandomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1) + min)
  return new Promise(resolve => setTimeout(resolve, delay))
}
export async function resetChatHistory(): Promise<void> {
  await fetch(`${API_BASE_URL}/reset-chat`, {
    method: 'POST',
  })
}
// export async function processURL(url: string, onUpdate: (type: string, data: any) => void) {
//   const response = await fetch("http://localhost:5000/process", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ url }),
//   });

//   if (!response.ok) {
//     throw new Error("Processing failed");
//   }

//   const reader = response.body?.getReader();
//   if (!reader) return;

//   const decoder = new TextDecoder("utf-8");
//   let done = false;

//   while (!done) {
//     const { value, done: readerDone } = await reader.read();
//     done = readerDone;

//     if (value) {
//       const chunk = decoder.decode(value, { stream: true });
//       chunk.split("\n").forEach((line) => {
//         if (line.trim()) {
//           const { type, data } = JSON.parse(line);
//           onUpdate(type, data); // Callback to handle updates
//         }
//       });
//     }
//   }
// }

// export async function processURL(url: string, onUpdate: (type: string, data: any) => void) {
//   const eventSource = new EventSource(
//     `http://localhost:5000/process?url=${encodeURIComponent(url)}`
//   );

//   return new Promise((resolve, reject) => {
//     eventSource.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       if (data.error) {
//         eventSource.close();
//         reject(new Error(data.error));
//       } else {
//         onUpdate(data.type, data.result);
//       }
//     };

//     eventSource.onerror = (error) => {
//       eventSource.close();
//       reject(error);
//     };

//     eventSource.addEventListener('complete', () => {
//       eventSource.close();
//       resolve(undefined);
//     });
//   });
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


export async function preprocessArticle(url: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/preprocess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!response.ok) throw new Error('Failed to preprocess article')
}

export async function getSummary(url: string): Promise<Summary> {
  await simulateRandomDelay(1000, 3000)
  const response = await fetch(`${API_BASE_URL}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!response.ok) throw new Error('Failed to get summary')
  return response.json()
}

export async function getRelatedArticles(url: string): Promise<RelatedArticle[]> {
  await simulateRandomDelay(1500, 4000)
  const response = await fetch(`${API_BASE_URL}/related`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!response.ok) throw new Error('Failed to get related articles')
  return response.json()
}

export async function chatWithAI(message: string): Promise<ChatMessage> {
  await simulateRandomDelay(500, 2000)
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
  if (!response.ok) throw new Error('Failed to get AI response')
  const data = await response.json()
  return { text: data.response, isUser: false }
}

