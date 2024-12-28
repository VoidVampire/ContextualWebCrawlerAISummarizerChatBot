from quart import Quart, request, jsonify, Response, websocket
from quart_cors import cors
import asyncio
import json
from bs4 import BeautifulSoup
from transformers import pipeline, AutoTokenizer
import nltk
import re
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
import requests
import time
from urllib.parse import urlparse
from googlesearch import search 
from keybert import KeyBERT
import webCrawler
from hypercorn.config import Config
from hypercorn.asyncio import serve
from chatAI import setup_chatbot, RAGChatbot
import uuid
from datetime import datetime
app = Quart(__name__)
cors(app)


# Download necessary NLTK data
nltk.download('punkt')
nltk.download('stopwords')
# Initialize the summarization pipeline
model_name = 'pszemraj/long-t5-tglobal-base-16384-book-summary'
summarizer = pipeline('summarization', model=model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)

chunk_size = min(tokenizer.model_max_length, 3000)

chatbot = None
preprocessing_done = False

@app.websocket('/chat')
async def chat():
    global chatbot, preprocessing_done
    if not preprocessing_done:
        return {"error": "Chatbot is not yet ready. Please wait for preprocessing to complete."}, 400


    """WebSocket handler for real-time chat."""
    while True:
        try:
            if chatbot is None:
                chatbot = setup_chatbot("cleaned_text.txt")

            data = await websocket.receive_json()
            question = data.get("message", "")
            if not question:
                await websocket.send_json({"error": "No message provided."})
                continue

            response = chatbot.chat(question)
            await websocket.send_json({"response": response})
        except asyncio.CancelledError:
            break
        except Exception as e:
            await websocket.send_json({"error": str(e)})

@app.route('/reset-chat', methods=['POST'])
async def reset_chat():
    global chatbot
    """Endpoint to reset chatbot state."""
    chatbot.reset()
    return jsonify({"status": "Chatbot reset successfully."}), 200

def summarize_chunk(chunk, max_length=512, min_length=100, do_sample=False):
    return summarizer(chunk, max_length=max_length, min_length=min_length, do_sample=do_sample)

async def summarization_task(sentences):
    print("Summarization Started")
    chunks, current_chunk = [], ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += " " + sentence
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    summaries = []
    
    # Create a new event loop for the process pool
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor() as executor:
        # Process all chunks concurrently
        futures = [
            loop.run_in_executor(executor, summarize_chunk, chunk)
            for chunk in chunks
        ]
        
        # Wait for all chunks to complete
        results = await asyncio.gather(*futures)
        
        # Process results in order
        for idx, result in enumerate(results):
            try:
                summaries.append((idx, result[0]['summary_text']))
            except Exception as e:
                print(f"Error in chunk {idx}: {e}")
    
    # Sort and combine summaries
    summaries.sort(key=lambda x: x[0])
    full_summary = " ".join([summary for _, summary in summaries])
    final_summary = full_summary.replace("Victor", "author")\
                               .replace("Tommo", "author")\
                               .replace("chapter", "article")\
                               .replace("lesson", "article")
    print("Summarization Complete")
    return {"summary": final_summary}
def extract_keywords(text, num_keywords=4):
    kw_model = KeyBERT()
    keywords = kw_model.extract_keywords(text, keyphrase_ngram_range=(1, 2), stop_words=None)
    return [keyword for keyword, _ in keywords]

def perform_search(query):
    return list(search(query, num_results=5))

def google_dork_search(keywords, num_results=5):
    queries = [f'"{keyword}"' for keyword in keywords]
    with ThreadPoolExecutor() as executor:
        results = list(executor.map(perform_search, queries))
    # Flatten the list of results from different queries
    search_results = [item for sublist in results for item in sublist]
    return search_results[:num_results]  # Limit to top results

async def crawling_task(preprocessed_text):
    print("Crawling started..........")
    keywords = extract_keywords(preprocessed_text, num_keywords=3)
    print(keywords)
    seed_urls = google_dork_search(keywords, num_results=10)
    print("A",seed_urls)
    relevant_links = await webCrawler.get_relevant_links(seed_urls, preprocessed_text)
    print("re",relevant_links)
    formatted_links = [{"url": link} for link in relevant_links]
    print("A",formatted_links)
    print("Crawling finished..........")
    return formatted_links

# async def crawling_task(preprocess_text):
#     print("Crawling started")
#     await asyncio.sleep(1)
#     print("Crawling complete")
#     return [
#         {"url": "https://example.com/1"},
#         {"url": "https://example.com/22"}
#     ]

@app.route('/process', methods=['POST'])
async def process():
    global preprocessing_done, chatbot
    try:
        request.timeout = None
        data = await request.get_json()
        url = data.get('url')
        
        # Fetch and preprocess content
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        html_content = response.text
        
        print("Preprocessing Started")
        soup = BeautifulSoup(html_content, 'html.parser')
        for unwanted in soup.find_all(class_=['navigation', 'reflist', 'catlinks']):
            unwanted.decompose()
        
        main_content = soup.find('article') or soup.find('main') or soup.find('div', class_='post') or soup.body
        relevant_content = []
        
        for tag in main_content.find_all(['h2', 'p', 'li'], recursive=True):
            text = tag.get_text().strip()
            if text and len(text) > 20:
                relevant_content.append(text)
        
        cleaned_text = ' '.join(relevant_content)
        with open("cleaned_text.txt", "w", encoding="utf-8-sig") as file:
            file.write(cleaned_text)
            
        text = re.sub(r'\s+', ' ', cleaned_text)
        sentences = nltk.tokenize.sent_tokenize(text)
        print("Preprocessing Done")
        chatbot = setup_chatbot("cleaned_text.txt")
        preprocessing_done = True
        # with open("preprocessed_text.txt", "w") as file:
        #     for i in sentences:
        #         file.write(i)
        # Create response queue
        queue = asyncio.Queue()
        
        async def handle_task(task, task_name):
            try:
                result = await task
                await queue.put(json.dumps({
                    "type": task_name,
                    "result": result
                }))
            except Exception as e:
                print(f"Error in {task_name}:", str(e))
                await queue.put(json.dumps({
                    "type": task_name,
                    "error": str(e)
                }))

        task1 = asyncio.create_task(summarization_task(sentences))
        task2 = asyncio.create_task(crawling_task("\n".join(sentences)))
        
        tasks = [
            asyncio.create_task(handle_task(task1, "summarization")),
            asyncio.create_task(handle_task(task2, "crawling"))
        ]

        async def stream_results():
            tasks_completed = 0
            try:
                while tasks_completed < 2:
                    result = await queue.get()
                    tasks_completed += 1
                    yield f"data: {result}\n\n"
            except Exception as e:
                print(f"Error in stream_results: {e}")
                error_msg = json.dumps({
                    "type": "error",
                    "error": str(e)
                })
                yield f"data: {error_msg}\n\n"

        response = Response(
            stream_results(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*'
            }
        )
        response.timeout = None
        return response

    except Exception as e:
        print("Error in process route:", str(e))
        return {"error": str(e)}, 500

if __name__ == '__main__':
    config = Config()
    # Set effectively infinite timeouts
    config.keep_alive_timeout = None  # No timeout
    config.worker_class = "asyncio"
    config.bind = ["localhost:5000"]
    config.worker_connections = 1000
    
    # Remove all timeout restrictions
    config.timeout = {
        'keep_alive': None,  # No keep-alive timeout
        'graceful_timeout': None,  # No graceful shutdown timeout
        'worker_timeout': None,  # No worker timeout
    }
    
    # Increase max request size if needed for large articles
    config.max_request_size = 100 * 1024 * 1024  # 100MB
    
    asyncio.run(serve(app, config))