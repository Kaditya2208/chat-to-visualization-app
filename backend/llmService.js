// backend/llmService.js
const OpenAI = require('openai');

// Configure the client to connect to your local Ollama server
const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1', // Ollama's local server address
  apiKey: 'ollama', // This is a required placeholder, but Ollama doesn't use it
});

/**
 * Generates an explanation and a visualization JSON spec from an LLM.
 * @param {string} question The user's question.
 * @returns {Promise<object>} A promise that resolves to an object with "text" and "visualization" keys.
 */
async function generateExplanationAndVisualization(question) {
    const systemPrompt = `
        You are an expert science educator. Your task is to explain a concept clearly and generate a corresponding visualization specification in JSON format.
        You must respond with ONLY a single valid JSON object and nothing else.
        
        The JSON object must have two top-level keys: "text" and "visualization".
        
        Example Output:
        {
          "text": "Newton’s First Law states that an object at rest stays at rest...",
          "visualization": { "id": "vis_newton_first_law", "duration": 5000, "fps": 30, "layers": [] }
        }
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "llama3", // Or whichever Ollama model you have downloaded, e.g., "mistral"
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: question },
            ],
            response_format: { type: "json_object" },
        });

        let content = response.choices[0].message.content;

        // --- Robust Parsing Logic ---
        console.log("Raw LLM Response:", content); // Log for debugging

        try {
            // First, try to parse the content directly
            let parsedContent = JSON.parse(content);
            
            // Check if the expected keys are present
            if (parsedContent.text && parsedContent.visualization) {
                return parsedContent;
            }

            // Handle cases where the object might be nested
            if (typeof parsedContent === 'object' && parsedContent !== null) {
                for (const key in parsedContent) {
                    if (typeof parsedContent[key] === 'object' && parsedContent[key] !== null && parsedContent[key].text && parsedContent[key].visualization) {
                        console.log(`Found nested content in key: ${key}`);
                        return parsedContent[key];
                    }
                }
            }

        } catch (e) {
            console.warn("Initial JSON.parse failed, will try cleaning the string.", e.message);
        }

        // If direct parsing fails, clean the string to find the JSON block and try again
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0]) {
            console.log("Found JSON block inside a string. Attempting to re-parse.");
            return JSON.parse(jsonMatch[0]);
        }
        
        throw new Error("Could not parse a valid JSON object from the LLM response.");

    } catch (error) {
        console.error("Error calling LLM service:", error);
        throw new Error("Failed to generate response from LLM.");
    }
}

module.exports = { generateExplanationAndVisualization };