# SmartSync Enhancement: Inbox Zero Assistant

## 1. Vision & Goal

Transform SmartSync from a focused event extraction tool into a conversational AI assistant embedded within the Gmail side panel. The goal is to provide users with a natural language interface to interact with their email content, enabling efficient summarization, information retrieval, task management, and drafting assistance, ultimately helping them achieve "Inbox Zero" faster and more effectively.

## 2. Core Capabilities (Proposed)

The assistant aims to understand and respond to a variety of user requests within the context of their emails:

*   **General Email Q&A:**
    *   **Specific Information Retrieval:** Answer questions like "What was the attachment name in the email from John Doe yesterday?", "Find the tracking number from my latest order confirmation."
    *   **Targeted Search:** "Show me emails about 'Project Phoenix' received this week."
    *   **Summarization:** "Summarize the email thread with Alice about the Q3 budget.", "What are the key points from the last 3 emails from my manager?"
    *   **Specific Data Extraction:** "Extract action items from this meeting follow-up.", "What's the address mentioned in the venue confirmation email?"

*   **Contextual Actions:**
    *   **Calendar Integration (Enhanced):**
        *   Query: "Any meetings scheduled for Friday?"
        *   Response: "Yes, 'Team Standup' at 9 AM."
        *   Action: "Add that to my calendar." -> Trigger calendar addition.
    *   **Task Management (New):**
        *   Query: "Remind me to review this document by tomorrow."
        *   Action: Suggest creating a task ("Create task: Review document '[Subject]' due tomorrow?") -> Integrate with Google Tasks (or other providers).
    *   **Drafting Assistance (New):**
        *   Query: (While viewing an email) "Draft a quick reply confirming receipt."
        *   Action: Generate a draft -> Provide button to open Gmail compose window with the draft.

*   **Conversational Flow:**
    *   **Multi-Turn Dialogue:** Maintain context across several user messages within a session.
    *   **Clarification:** Ask follow-up questions if the user's request is ambiguous.
    *   **Proactive Suggestions:** Offer relevant actions based on email content (e.g., suggest creating tasks from identified action items).

## 3. User Experience (UX)

*   **Interface:** Replace the current single-prompt input in the side panel with a chat interface.
    *   Chat input field for user messages.
    *   Display area showing conversation history (user prompts & AI responses).
*   **Output:** AI responses will primarily be text but can include:
    *   Structured cards for events (with "Add to Calendar" button).
    *   Task suggestions (with "Create Task" button).
    *   Draft snippets (with "Open Compose" button).
    *   Direct links to open relevant emails in the main Gmail view.
*   **Interaction:** Users interact via natural language queries and button clicks on suggested actions.

## 4. Technical Architecture & Implementation Details (Proposed)

*   **Side Panel (`src/content/floating_button.js`):**
    *   Requires significant UI rework to implement the chat interface (history display, input handling).
    *   Needs logic to parse AI responses, display them appropriately (text vs. cards), and handle embedded action buttons.
    *   Will manage sending user messages and conversation history snippets to the background.

*   **Background Worker (`src/background/worker.js`):**
    *   **State Management:** Needs to manage conversational state (message history) per session.
    *   **LLM Interaction Strategy (Hybrid Approach Recommended):**
        *   **External LLM (Current OpenAI):** Continue leveraging for complex reasoning, nuanced intent recognition (events, tasks), cross-email Q&A, non-English content, and potentially as a fallback.
        *   **On-Device AI (Chrome Built-in APIs - Experimental):** Explore using Chrome's [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api) and [Prompt API](https://developer.chrome.com/docs/extensions/ai/prompt-api) (powered by Gemini Nano) for specific tasks after registering for their Origin Trials.
            *   **Pros:** Enhanced privacy (data stays on device), potential speed improvements for simpler tasks, reduced external API costs.
            *   **Cons:** Experimental (Origin Trial), currently English-only, likely less capable than large server-side models for complex tasks, requires initial model download by the user.
            *   **Potential Uses:** Summarization (`Summarizer API`), simple Q&A on limited context, drafting assistance, simple information extraction (`Prompt API`).
        *   **Intelligent Routing:** Implement logic in the background worker to analyze user requests and route them to the appropriate model (on-device or external) based on complexity, privacy sensitivity, and required capabilities.
    *   **Prompt Engineering:** Develop and adapt system prompts for both external and potentially on-device models.
    *   **Context Building:** Determine which email content (full emails, snippets, summaries) to pass to the chosen LLM based on the user's query and conversation history. Implement strategies to stay within token limits.
    *   **Email Retrieval:** Enhance `handleEventExtraction` (or create new functions) to fetch emails based on conversational queries, potentially fetching metadata first and full content only when necessary.
    *   **Action Dispatching:** Implement logic to interpret signals from the LLM response (e.g., specific keywords, structured data fragments) to trigger appropriate actions (calling `addEventToCalendar`, interacting with Google Tasks API, etc.).
    *   **API Integrations:** Add new API clients/interactions for Google Tasks or other task/drafting services. Requires requesting additional permissions in `manifest.json`.

*   **LLM Prompting Strategy:**
    *   Shift from a single-purpose extraction prompt to a more general assistant prompt.
    *   Incorporate conversation history into the prompt context.
    *   Instruct the LLM to clearly signal when an action is suggested or required, possibly using special tags or a structured portion within its response.
    *   Modify LLM prompting for basic Q&A and summarization based on provided context.

*   **Context Management:**
    *   Retrieve emails matching the user's query intent.
    *   Decide which parts of the email(s) and conversation history are relevant context for the LLM.
    *   Implement strategies for summarizing long emails or threads before sending to the LLM.

*   **Action Mapping:**
    *   Define a clear mapping between LLM signals/intents and background worker functions.
    *   Example: If LLM response includes `[ACTION:CREATE_TASK info={...}]`, the background worker parses this and calls a `createGoogleTask` function.

## 5. Phased Rollout Plan

1.  **Phase 1: Foundational Chat UI & Scoped Q&A:**
    *   Implement the basic chat interface in the side panel.
    *   Allow users to perform an initial email search (similar to current functionality).
    *   Enable users to ask questions *about the emails retrieved in that specific search*. The context sent to the LLM is limited to the currently fetched emails.
    *   Modify LLM prompting for basic Q&A and summarization based on provided context.

2.  **Phase 2: Integrate Event Actions:**
    *   Adapt the existing event extraction and calendar addition flow to work within the chat interface.
    *   AI should present found events as cards with an "Add to Calendar" button.
    *   **(Optional):** Investigate using Chrome Prompt API for simpler event identification as a potential alternative/complement.

3.  **Phase 3: Task Creation:**
    *   Integrate with Google Tasks API (request new permissions).
    *   Train/prompt the LLM to identify potential tasks or understand direct task creation requests.
    *   Implement action mapping to trigger task creation in the background.
    *   Display task creation suggestions/confirmations in the chat.

4.  **Phase 4: Drafting Assistance:**
    *   Develop prompts for generating simple email replies based on context.
    *   Implement logic to open the Gmail compose window pre-filled with the draft.

5.  **Phase 5: Advanced Conversation & Proactivity:**
    *   Improve multi-turn context handling.
    *   Implement clarifying questions from the AI.
    *   Explore proactive suggestions (e.g., suggesting tasks after summarizing meeting notes).

## 6. Challenges & Considerations

*   **API Costs & Rate Limits:** Conversational interactions and fetching full email content will increase OpenAI and Google API usage. Need robust rate limiting, caching, and potentially optimization strategies (e.g., using cheaper/faster LLM models for simple Q&A).
*   **Latency:** More complex LLM interactions might increase response time. UI needs to handle loading/waiting states effectively.
*   **Prompt Complexity:** Designing prompts that reliably handle diverse requests and correctly signal actions is challenging, especially across different model types (on-device vs. external).
*   **Context Window Limits:** Managing email content and conversation history within the LLM's context window requires careful summarization and context selection.
*   **Action Reliability:** Ensuring the LLM accurately signals the correct action and parameters requires thorough testing and potentially fine-tuning or few-shot prompting.
*   **Permissions:** Adding new functionality (like Tasks) will require requesting additional user permissions, which needs clear justification.
*   **Privacy:** Sending broader email content to the LLM for Q&A requires careful filtering/anonymization strategies (if possible) and transparent communication with the user about what data is processed externally. **Leveraging on-device APIs mitigates this significantly for supported tasks.**
*   **UI Complexity:** Building and maintaining a dynamic chat interface is more complex than the previous list-based UI.
*   **Built-in API Handling:** Requires managing Origin Trial registration, API availability checks, and model download states.

This README provides a roadmap for transforming SmartSync into a powerful conversational email assistant. 