import os
from typing import List, Dict
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain_core.runnables import RunnablePassthrough
from langchain_cohere import ChatCohere, CohereEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Environment setup
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["COHERE_API_KEY"] = ""
os.environ["LANGCHAIN_ENDPOINT"]="https://api.smith.langchain.com"
os.environ["LANGCHAIN_API_KEY"]=""
os.environ["LANGCHAIN_PROJECT"]=""

class RAGChatbot:
    def __init__(self, vector_store, llm):
        self.vector_store = vector_store
        self.llm = llm
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        self._setup_prompts()
        self._create_chain()
        self.chat_history = []
    def reset(self):
        """Reset chatbot state."""
        self.vector_store.reset()  # Clear vector store
        self.chat_history = []    # Clear chat history
        self.memory.clear()       # Clear memory
        
    def _setup_prompts(self):
        self.qa_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful AI assistant that answers questions based on the given context. 
            If you don't find the answer in the context, say so. For follow-up questions, use both the 
            context and the chat history to provide accurate responses.
            
            Context: {context}"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}")
        ])
    
    def _create_chain(self):
        def retrieve_docs(query: str) -> str:
            docs = self.vector_store.similarity_search(query, k=2)
            return "\n\n".join(doc.page_content for doc in docs)
        
        self.chain = {
            "context": retrieve_docs,
            "chat_history": lambda x: self.chat_history,
            "question": RunnablePassthrough()
        } | self.qa_prompt | self.llm

    def chat(self, question: str) -> str:
        """Main interface for chatting with the bot"""
        # Create a new human message
        human_msg = HumanMessage(content=question)
        
        # Get response
        response = self.chain.invoke(question)
        
        # Create AI message from response
        ai_msg = AIMessage(content=response.content)
        
        # Update chat history
        self.chat_history.append(human_msg)
        self.chat_history.append(ai_msg)
        
        # Save to memory
        self.memory.save_context(
            {"input": question},
            {"output": response.content}
        )
        
        return response.content

def setup_chatbot(file_path: str):
    """Setup function that creates and returns a configured chatbot"""
    # Initialize LLM and embeddings
    llm = ChatCohere(model="command-r-plus")
    embeddings = CohereEmbeddings(model="embed-english-v3.0")
    
    # Create vector store
    vector_store = InMemoryVectorStore(embeddings)
    
    # Load and process document
    with open(file_path, "r", encoding="utf-8") as file:
        text = file.read()
    
    # Create document with metadata
    docs = [Document(
        page_content=text,
        metadata={"source": file_path}
    )]
    
    # Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        add_start_index=True
    )
    all_splits = text_splitter.split_documents(docs)
    
    # Add documents to vector store
    vector_store.add_documents(documents=all_splits)
    
    # Create and return chatbot instance
    return RAGChatbot(vector_store, llm)

def main():
    # Initialize chatbot
    chatbot = setup_chatbot("cleaned_text.txt")  # Replace with your file path
    
    # Interactive chat loop
    print("Chat with the bot (type 'quit' to exit)")
    while True:
        question = input("\nYou: ").strip()
        if question.lower() == 'quit':
            break
            
        response = chatbot.chat(question)
        print(f"\nAssistant: {response}")

if __name__ == "__main__":
    main()