//@ts-check
// [x]. get the content from the input element
// [x]. send the content to the val town endpoint using fetch POST request
// [x]. await the response
// [x]. get the json from the response
// [x]. Add the user message to the .chat-history

// How to control the behaviour of the chat bot?
// Answered: The `truncateHistory` function, governed by `MAX_HISTORY_LENGTH`, controls the context length.

// Bonus:
// What happens if the context gets to long?
// Answered: The `truncateHistory` function keeps the context within a manageable size.
// What happens if the chat-history window get s to full (scolling)
// Answered: The `scrollToBottom` function automatically handles scrolling.

let messageHistory = {
    // messages: [{role: user | assistant | system; content: string}]
    response_format: { type: 'json_object' }, // This property might be ignored by some LLM APIs if not set server-side
    temperature: 1, // This temperature might be overridden by your Val Town endpoint, but keep it consistent.
    messages: [
        {
            role: 'system',
            content: `
            You are an AI trained to act as an expert fanfiction generator, specifically for Archive of Our Own (AO3) content. You will never break character.
            Your response MUST be a single JSON object structured as follows, with each key representing a category and its value containing the generated text or list. Ensure the JSON is properly formatted with appropriate line breaks and indentation for readability.

            Example of expected JSON output:
            \`\`\`json
            {
              "title": "A Galaxy Far, Far Away From Homework",
              "fandom": "Star Wars - All Media Types",
              "tags": "Luke Skywalker/Han Solo, Angst with a Happy Ending, Jedi Master Luke, Smuggler Han, Alternate Universe - Modern, College AU, Fluff and Angst, Pining, Mutual Pining, First Kiss, Established Relationship, Rated Teen And Up, No Archive Warnings Apply",
              "word_count": "15,000 words",
              "prompt": "Luke Skywalker is struggling with his astrophysics homework, and Han Solo, surprisingly, offers to tutor him, leading to unexpected feelings and late-night study sessions.",
              "search_terms": "Luke Skywalker, Han Solo, College AU, Star Wars, Fluff, Angst"
            }
            \`\`\`

            For every user input, you will generate the following fanfiction details:
            Title: A creative, relevant, and engaging fanfiction title that directly responds to the user's input and expertly incorporates any pop culture references.
            Fandom: A specific and appropriate fandom name for the story.
            Tags: A comma-separated list of 10-20 relevant and commonly used AO3 tags, including character names, tropes, ratings, warnings, relationships, and triggers. This list should be presented as a single string.
            Word Count: A realistic and appropriate word count between 500 and 100k+ words.
            Prompt: A brief, open-ended prompt (1-2 sentences) that could have inspired the fanfiction, inviting further story development.
            Search Terms: A comma-separated list of 3-5 crucial keywords (characters, main tropes, or key plot elements) that would be highly effective for searching for similar fanfiction on AO3.

            Responsiveness: The title must directly respond to the user's input.
            Pop Culture Integration: Actively identify and creatively integrate pop culture references into the title. Consider crossovers, alternative universes, or thematic parallels.
            Varying Style: Adapt the tone (humorous, angsty, romantic, mysterious, dramatic, etc.) based on the user's implied input.
            Specificity vs. Detail: Be specific enough to make the fanfiction concept clear, but leave room for imagination.
            No Story Content: Do not generate actual story content beyond the prompt.
            AO3 Styling: Ensure the content within the summary and tags aligns with typical AO3 conventions (e.g., character names, trope phrasing).

            Remember to always respond ONLY with the JSON object, and nothing else. Do not include any conversational text or explanation.
            `,
        },
    ],
};

// TODO: use your own val.town endpoint
// remix: https://val.town/remix/ff6347-openai-api
const apiEndpoint = 'https://MaddyR--7d22af21c42c473da4c94b422abf5c9b.web.val.run';
if (!apiEndpoint.includes('run')) {
    throw new Error('Please use your own val.town endpoint!!!');
}

const MAX_HISTORY_LENGTH = 10; // Controls how many recent messages to keep in history (excluding system message)

document.addEventListener('DOMContentLoaded', () => {
    // get the history element
    const chatHistoryElement = document.querySelector('.chat-history');
    const inputElement = document.querySelector('input');
    const formElement = document.querySelector('form');
    // check if the elements exists in the DOM
    if (!chatHistoryElement) {
        throw new Error('Could not find element .chat-history');
    }
    if (!formElement) {
        throw new Error('Form element does not exists');
    }
    if (!inputElement) {
        throw new Error('Could not find input element');
    }
    // run a function when the user hits send
    formElement.addEventListener('submit', async (event) => {
        event.preventDefault(); // dont reload the page

        const formData = new FormData(formElement);
        const content = formData.get('content');
        if (!content) {
            throw new Error("Could not get 'content' from form");
        }
        //@ts-ignore
        messageHistory.messages.push({ role: 'user', content: content });
        messageHistory = truncateHistory(messageHistory); // Truncate history before sending
        chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
        inputElement.value = ''; // Clear the input field
        // @ts-ignore
        scrollToBottom(chatHistoryElement); // Scroll to the bottom of the chat

        // Add a temporary "Thinking..." message to show activity
        const thinkingMessageDiv = document.createElement('div');
        thinkingMessageDiv.classList.add('message', 'assistant', 'thinking');
        thinkingMessageDiv.innerHTML = '<p>Crawling the Web...</p>';
        chatHistoryElement.appendChild(thinkingMessageDiv);
        // @ts-ignore
        scrollToBottom(chatHistoryElement);

        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify(messageHistory),
            });

            // Remove the thinking message regardless of success or failure
            thinkingMessageDiv.remove();

            if (!response.ok) {
                const errorText = await response.text();
                // Add a user-friendly error message to chat history
                const errorMessageDiv = document.createElement('div');
                errorMessageDiv.classList.add('message', 'error');
                errorMessageDiv.innerHTML = `<p>Error: Could not get a response from the server.</p><p>Details: ${errorText}</p>`;
                chatHistoryElement.appendChild(errorMessageDiv);
                // @ts-ignore
                scrollToBottom(chatHistoryElement);
                console.error("API Response Error:", errorText);
                return; // Stop execution
            }

            const json = await response.json();
            console.log("Raw API Response JSON:", json); // Log raw JSON for debugging

            // @ts-ignore - Access the message content from the API response structure
            const assistantMessageContent = json.completion.choices[0].message.content;

            // Add the assistant's response to message history
            messageHistory.messages.push({ role: 'assistant', content: assistantMessageContent });
            messageHistory = truncateHistory(messageHistory); // Truncate history after receiving response

            chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
            // @ts-ignore
            scrollToBottom(chatHistoryElement); // Scroll to the bottom again for the new message

        } catch (error) {
            // Remove the thinking message if fetch itself fails (e.g., network error)
            thinkingMessageDiv.remove();

            console.error("Fetch Request Error:", error);
            const errorMessageDiv = document.createElement('div');
            errorMessageDiv.classList.add('message', 'error');
            errorMessageDiv.innerHTML = `<p>A network error occurred. Please check your internet connection or try again later.</p>`;
            chatHistoryElement.appendChild(errorMessageDiv);
            // @ts-ignore
            scrollToBottom(chatHistoryElement);
        }
    });
});

/**
 * Generates the HTML for the chat history, displaying fanfiction details and search keywords.
 * @param {object} mhistory - The message history object.
 * @returns {string} The combined HTML string for the chat history.
 */
function addToChatHistoryElement(mhistory) {
    const htmlStrings = mhistory.messages.map((message) => {
        if (message.role === 'system') {
            return ''; // System messages are not displayed
        } else if (message.role === 'assistant') {
            let parsedContent;
            let displayHtml = ''; // This will hold all the fanfic details

            try {
                parsedContent = JSON.parse(message.content);

                // --- Construct the main fanfic details HTML ---
                if (parsedContent.title) {
                    displayHtml += `<p><strong>Title:</strong> ${parsedContent.title}</p>`;
                }
                if (parsedContent.fandom) {
                    displayHtml += `<p><strong>Fandom:</strong> ${parsedContent.fandom}</p>`;
                }
                if (parsedContent.tags) {
                    displayHtml += `<p><strong>Tags:</strong> ${parsedContent.tags}</p>`;
                }
                if (parsedContent.word_count) {
                    displayHtml += `<p><strong>Word Count:</strong> ${parsedContent.word_count}</p>`;
                }
                if (parsedContent.prompt) {
                    displayHtml += `<p><strong>Prompt:</strong> ${parsedContent.prompt}</p>`;
                }

                // Display Search Terms or Tags as a hint for the user
                if (parsedContent.search_terms) {
                    displayHtml += `<p><strong>Recommended Search Keywords for AO3:</strong> ${parsedContent.search_terms}</p>`;
                } else if (parsedContent.tags) {
                    // Fallback to tags if search_terms are not provided
                    displayHtml += `<p><strong>Recommended Search Keywords for AO3 (from tags):</strong> ${parsedContent.tags}</p>`;
                }

                // NO AO3 LINK IS GENERATED HERE - it's intentionally left out.

                // Return the combined HTML
                return `<div class="message ${message.role}">${displayHtml}</div>`;

            } catch (e) {
                console.error("Error parsing assistant's message content as JSON:", e);
                // Fallback: display raw content with an error message if parsing fails
                return `<div class="message ${message.role} error">
                            <p>Oops! I had trouble generating a fanfiction idea in the expected format.</p>
                            <p>Here's what I received (for debugging):</p>
                            <pre>${message.content}</pre>
                            <p>Please try again!</p>
                        </div>`;
            }
        } else {
            // User messages
            return `<div class="message ${message.role}">${message.content}</div>`;
        }
    });
    return htmlStrings.join('');
}

/**
 * Scrolls the given container element to its bottom.
 * @param {HTMLElement} container - The HTML element to scroll.
 */
function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
}

/**
 * Truncates the message history to keep only the most recent messages, preserving the system message.
 * @param {object} h - The message history object.
 * @returns {object} The truncated message history object.
 */
function truncateHistory(h) {
    if (!h || !h.messages || h.messages.length <= 1) {
        return h; // No truncation needed or possible if only system message or fewer
    }
    const { messages } = h;
    const [system, ...rest] = messages; // Separate system message from the rest
    if (rest.length > MAX_HISTORY_LENGTH) {
        // Keep the system message and the last MAX_HISTORY_LENGTH user/assistant messages
        return { messages: [system, ...rest.slice(-MAX_HISTORY_LENGTH)] };
    } else {
        return h; // No truncation needed
    }
}