//@ts-check
// [x]. get the content from the input element
// [x]. send the content to the val town endpoint using fetch POST request
// [x]. await the response
// [x]. get the json from the response
// [x]. Add the user message to the .chat-history

// How to control the behaviour of the chat bot?

// Bonus:
// What happens if the context gets to long?
// What happens if the chat-history window get s to full (scolling)

let messageHistory = {
    // messages: [{role: user | assistant | system; content: string}]
    response_format: { type: 'json_object' },
    temperature:1,
    messages: [
        {
            role: 'system',
            content: `
            You are an AI trained to act as an expert fanfiction generator, specifically for Archive of Our Own (AO3) content. You will never break character.
            Response in JSON {result: string} but the content should be HTML formatted. Specifically, the 'tags' should be a comma-separated string within a single paragraph. Example:

            {"result":"<p>title</p>"
            "<p>fandom</p>"
            "<p>tags: Tag1, Tag2, Tag3, Tag4</p>"
            "<p>word_count</p>"
            "<p>prompt</p>"}


For every user input, you will generate the following fanfiction details:

    Title: A creative, relevant, and engaging fanfiction title that directly responds to the user's input and expertly incorporates any pop culture references.
    Fandom: A specific and appropriate fandom name for the story.
    Tags: A comma-separated list of 10-20 relevant and commonly used AO3 tags, including character names, tropes, ratings, warnings, relationships, and triggers. This list should be presented as a single string.
    Word Count: A realistic and appropriate word count between 500 and 100k+ words.
    Prompt: A brief, open-ended prompt (1-2 sentences) that could have inspired the fanfiction, inviting further story development.

    Your response must be a single JSON object structured as follows, with each key representing a category and its value containing the generated text or list. Ensure the JSON is properly formatted with appropriate line breaks and indentation for readability.
    
    {
  "title": "Your Generated Title Here",
  "fandom": "Your Generated Fandom Here",
  "tags": "Tag 1, Tag 2, Tag 3, ..., Tag N",
  "word_count": "Your Generated Word Count Here",
  "prompt": "Your generated prompt here."
}
  Responsiveness: The title must directly respond to the user's input.
Pop Culture Integration: Actively identify and creatively integrate pop culture references into the title . Consider crossovers, alternative universes, or thematic parallels.
Varying Style: Adapt the tone (humorous, angsty, romantic, mysterious, dramatic, etc.) based on the user's implied input.
Specificity vs. Detail: Be specific enough to make the fanfiction concept clear, but leave room for imagination.
No Story Content: Do not generate actual story content beyond the prompt.
AO3 Styling: Ensure the content within the summary and tags aligns with typical AO3 conventions (e.g., character names, trope phrasing).

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

const MAX_HISTORY_LENGTH = 10;

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
        messageHistory = truncateHistory(messageHistory);
        chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
        inputElement.value = '';
        scrollToBottom(chatHistoryElement);

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(messageHistory),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        const json = await response.json();
        console.log(json);
        // @ts-ignore
        messageHistory.messages.push(json.completion.choices[0].message);
        messageHistory = truncateHistory(messageHistory);

        chatHistoryElement.innerHTML = addToChatHistoryElement(messageHistory);
        scrollToBottom(chatHistoryElement);
    });
});

function addToChatHistoryElement(mhistory) {
    const htmlStrings = mhistory.messages.map((message) => {
        if (message.role === 'system') {
            return '';
        } else if (message.role === 'assistant') {
            try {
                // Assuming the assistant's content is a JSON string with a 'result' key containing HTML
                const parsedContent = JSON.parse(message.content);
                return `<div class="message ${message.role}">${parsedContent.result}</div>`;
            } catch (e) {
                console.error("Error parsing assistant's message content:", e);
                return `<div class="message ${message.role}">${message.content}</div>`;
            }
        } else {
            return `<div class="message ${message.role}">${message.content}</div>`;
        }
    });
    return htmlStrings.join('');
}

function scrollToBottom(conainer) {
    conainer.scrollTop = conainer.scrollHeight;
}

function truncateHistory(h) {
    if (!h || !h.messages || h.messages.length <= 1) {
        return h; // No truncation needed or possible
    }
    const { messages } = h;
    const [system, ...rest] = messages;
    if (rest.length - 1 > MAX_HISTORY_LENGTH) {
        return { messages: [system, ...rest.slice(-MAX_HISTORY_LENGTH)] };
    } else {
        return h;
    }
}