# Chat-to-Visualization App 🤖🎨

This project is a full-stack web application that explains concepts using AI-generated text and dynamically rendered visualizations. A user can ask a scientific question, and the backend communicates with an LLM to generate both a clear explanation and a JSON specification for an animation, which is then rendered in the browser in real-time.


*(Suggestion: Take a screenshot of your working app and replace the line above with `![App Screenshot](path/to/your/screenshot.png)`)*

---
## Key Features

-   **AI-Powered Explanations:** Leverages a Large Language Model (LLM) to provide clear, concise answers to user questions.
-   **Dynamic Visualizations:** The LLM generates a JSON spec that is rendered as a playable animation on an HTML5 Canvas.
-   **Real-Time Updates:** Uses Server-Sent Events (SSE) to push new questions and answers to the client without needing a page refresh.
-   **Full-Stack Architecture:** Built with a Node.js/Express backend and a React frontend.
-   **Dark Mode:** Includes a theme toggle for user comfort.

---
## Tech Stack

-   **Frontend:** React.js
-   **Backend:** Node.js, Express.js
-   **Real-Time Communication:** Server-Sent Events (SSE)
-   **AI / LLM:** OpenAI API or **Ollama** (for local models like Llama 3)

---
## Setup and Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git)
cd YOUR_REPOSITORY
```

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```

### 3. Frontend Setup
```bash
# Navigate to the frontend directory from the root
cd frontend

# Install dependencies
npm install
```

### 4. LLM Setup (Choose One)

#### Option A: Ollama (Recommended for Free, Local Use)
1.  **Download and Install Ollama** from the official website: [https://ollama.com/](https://ollama.com/)
2.  After installation, run a model from your terminal. This will download the model (a few GB) and start the Ollama server in the background.
    ```bash
    ollama run llama3
    ```
3.  The backend is already configured to connect to Ollama by default.

#### Option B: OpenAI API
1.  In the `backend` directory, create a `.env` file:
    ```bash
    touch .env
    ```
2.  Add your OpenAI API key to the `.env` file:
    ```
    OPENAI_API_KEY=sk-YourSecretKeyGoesHere
    ```
3.  In `backend/llmService.js`, you must update the `OpenAI` client configuration and the model name to point to OpenAI instead of the local Ollama server.

---
## Running the Application

You will need to run the backend and frontend servers in separate terminal windows.

**1. Start the Backend Server:**
```bash
# In the /backend directory
node index.js
```
The server will start on `http://localhost:3001`.

**2. Start the Frontend Server:**
```bash
# In the /frontend directory
npm start
```
The application will open in your browser at `http://localhost:3000`.

---
## API Endpoints

The backend provides the following endpoints:

-   `POST /api/questions`: Submit a new question.
-   `GET /api/questions`: Fetch the history of all questions.
-   `GET /api/answers/:id`: Fetch a specific answer with its text and visualization data.
-   `GET /api/stream`: Establishes an SSE connection for real-time events.
