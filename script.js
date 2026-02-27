/**
 * REDDIT BOT - AI Logic
 * ---------------------
 * Note: Your API Key is stored securely in your browser's localStorage.
 */

// Primary and Fallback Models (Ordered for best results)
const MODELS = [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3n-e2b-it:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "z-ai/glm-4.5-air:free",
    "stepfun/step-3.5-flash:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "nvidia/nemotron-nano-9b-v2:free"
];

document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Post Mode Elements
    const generatePostBtn = document.querySelector('#post-mode .generateBtn');
    const rawInput = document.getElementById('rawInput');
    const postOutputContainer = document.querySelector('#post-mode .output-container');
    const hookOutput = document.getElementById('hookOutput');
    const bodyOutput = document.getElementById('bodyOutput');
    const toneSelect = document.getElementById('toneSelect');
    const postStatusArea = document.querySelector('#post-mode .statusArea');
    const postStatusText = document.querySelector('#post-mode .statusText');

    // Reply Mode Elements
    const generateReplyBtn = document.getElementById('generateReplyBtn');
    const commentInput = document.getElementById('commentInput');
    const customInstructions = document.getElementById('customInstructions');
    const replyOutputArea = document.getElementById('replyOutputArea');
    const replyOutput = document.getElementById('replyOutput');
    const replyStatusArea = document.querySelector('#reply-mode .statusArea');
    const replyStatusText = document.querySelector('#reply-mode .statusText');

    // Shared Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Load saved API key
    const savedKey = localStorage.getItem('reddit_bot_api_key');
    if (savedKey) apiKeyInput.value = savedKey;

    // Modal Control
    settingsBtn.addEventListener('click', () => settingsModal.hidden = false);
    closeSettings.addEventListener('click', () => settingsModal.hidden = true);
    window.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.hidden = true; });

    saveSettings.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('reddit_bot_api_key', key);
            settingsModal.hidden = true;
            alert('Settings saved successfully!');
        } else {
            alert('Please enter a valid API key.');
        }
    });

    // POST GENERATION
    generatePostBtn.addEventListener('click', async () => {
        const text = rawInput.value.trim();
        const apiKey = localStorage.getItem('reddit_bot_api_key');
        const selectedModel = document.querySelector('#post-mode .model-select').value;
        const selectedTone = toneSelect.value;

        if (!validateRequest(text, apiKey)) return;

        showLoading(generatePostBtn, postOutputContainer, postStatusArea, postStatusText);

        try {
            const result = await callOpenRouter(text, apiKey, selectedModel, getPostSystemPrompt(selectedTone), postStatusText);
            if (result) {
                const parsed = parseAIResponse(result);
                hookOutput.textContent = parsed.hook;
                bodyOutput.textContent = parsed.body;
                postOutputContainer.hidden = false;
                postOutputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            alert('Generation failed: ' + error.message);
        } finally {
            hideLoading(generatePostBtn, postStatusArea);
        }
    });

    // REPLY GENERATION
    generateReplyBtn.addEventListener('click', async () => {
        const text = commentInput.value.trim();
        const instructions = customInstructions.value.trim();
        const apiKey = localStorage.getItem('reddit_bot_api_key');
        const selectedModel = document.getElementById('replyModelSelect').value;

        if (!validateRequest(text, apiKey)) return;

        showLoading(generateReplyBtn, replyOutputArea, replyStatusArea, replyStatusText);

        try {
            const systemPrompt = getReplySystemPrompt(instructions);
            const result = await callOpenRouter(`Comment to address: "${text}"`, apiKey, selectedModel, systemPrompt, replyStatusText);
            if (result) {
                replyOutput.textContent = result.trim();
                replyOutputArea.hidden = false;
                replyOutputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            alert('Reply failed: ' + error.message);
        } finally {
            hideLoading(generateReplyBtn, replyStatusArea);
        }
    });

    // Logic Helpers
    function validateRequest(text, apiKey) {
        if (!apiKey) {
            alert('Please configure your OpenRouter API Key in settings first!');
            settingsModal.hidden = false;
            return false;
        }
        if (!text) {
            alert('Please enter some text first!');
            return false;
        }
        return true;
    }

    function showLoading(btn, container, statusArea, statusText) {
        btn.classList.add('loading');
        btn.disabled = true;
        container.hidden = true;
        statusArea.hidden = false;
        statusText.textContent = "Model: Connecting...";
    }

    function hideLoading(btn, statusArea) {
        btn.classList.remove('loading');
        btn.disabled = false;
        statusArea.hidden = true;
    }

    // Universal Copy Logic
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            const textToCopy = targetEl.textContent;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                btn.style.background = '#28a745';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = 'var(--accent-color)';
                }, 2000);
            });
        });
    });

    /**
     * Parses the AI response to separate Hook and Body
     */
    function parseAIResponse(rawText) {
        const hookMatch = rawText.match(/HOOK:([\s\S]*?)(?=BODY:|$)/i);
        const bodyMatch = rawText.match(/BODY:([\s\S]*)/i);
        return {
            hook: hookMatch ? hookMatch[1].trim() : "Untitled Post",
            body: bodyMatch ? bodyMatch[1].trim() : rawText.trim()
        };
    }

    function getPostSystemPrompt(tone) {
        return `You are a Reddit Viral Growth Engineer. transform raw ideas into top-tier Reddit posts.
CONSTRAINTS:
1. OUTPUT FORMAT: ONLY output in this format:
HOOK: [The Hook/Title]
BODY: [The Body Content]
2. HOOK (TITLE): 62-78 chars. Scroll-stopping.
3. BODY: Tone: ${tone}. Authentic Reddit formatting. NO AI fluff.
4. QUALITY: Story-driven means personal; upfront means direct; honest means transparent.`;
    }

    function getReplySystemPrompt(instructions) {
        let prompt = `You are a Reddit user replying to a comment.
Your goal is to sound like a real person—conversational, informal, and high-value.

CRITICAL CONSTRAINTS:
1. NO EM-DASHES (—). Do not use them ever.
2. NO HYPHENS for bullet points or lists. Use normal sentences.
3. NO GENERIC STARTERS like "I totally agree" or "That's a great point".
4. Be direct and concise.

${instructions ? `CUSTOM INSTRUCTIONS TO FOLLOW: ${instructions}` : "Simply think how a high-karma human user would reply to add value or continue the conversation."}`;
        return prompt;
    }

    /**
     * Attempts to generate a viral Reddit post or reply using OpenRouter
     */
    async function callOpenRouter(input, apiKey, preferredModel, systemPrompt, statusTextElement) {
        let modelsToTry = preferredModel === 'auto' ? MODELS : [preferredModel, ...MODELS.filter(m => m !== preferredModel)];
        let lastError = null;

        for (const model of modelsToTry) {
            if (statusTextElement) {
                statusTextElement.textContent = `Model: ${model.split('/')[1].split(':')[0]}...`;
            } else {
                console.log(`Trying ${model}...`);
            }

            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "X-Title": "Reddit Bot Pro",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            { "role": "system", "content": systemPrompt },
                            { "role": "user", "content": input }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorDetails = await response.text();
                    throw new Error(`Model ${model} failed: ${response.status} - ${errorDetails}`);
                }

                const data = await response.json();
                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return data.choices[0].message.content;
                } else {
                    throw new Error(`Model ${model} returned empty response.`);
                }
            } catch (err) {
                console.warn(`Error with model ${model}:`, err);
                lastError = err;
                if (preferredModel !== 'auto') break;
                continue;
            }
        }
        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    }
});
