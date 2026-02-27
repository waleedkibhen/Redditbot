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
    // UI Elements
    const generateBtn = document.getElementById('generateBtn');
    const rawInput = document.getElementById('rawInput');
    const outputContainer = document.getElementById('outputContainer');
    const hookOutput = document.getElementById('hookOutput');
    const bodyOutput = document.getElementById('bodyOutput');
    const modelSelect = document.getElementById('modelSelect');
    const toneSelect = document.getElementById('toneSelect');
    const statusArea = document.getElementById('statusArea');
    const statusText = document.getElementById('statusText');

    // Settings Elements
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    const apiKeyInput = document.getElementById('apiKeyInput');

    // Load saved API key
    const savedKey = localStorage.getItem('reddit_bot_api_key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
    }

    // Modal Control
    settingsBtn.addEventListener('click', () => {
        settingsModal.hidden = false;
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.hidden = true;
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.hidden = true;
        }
    });

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

    // Generation Logic
    generateBtn.addEventListener('click', async () => {
        const text = rawInput.value.trim();
        const apiKey = localStorage.getItem('reddit_bot_api_key');
        const selectedModel = modelSelect.value;
        const selectedTone = toneSelect.value;

        if (!apiKey) {
            alert('Please configure your OpenRouter API Key in settings first!');
            settingsModal.hidden = false;
            return;
        }

        if (!text) {
            alert('Please enter your idea first!');
            return;
        }

        // Show loading state
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
        outputContainer.hidden = true;
        statusArea.hidden = false;
        statusText.textContent = "Model: Connecting...";

        try {
            const result = await generateViralPost(text, apiKey, selectedModel, selectedTone);

            if (result) {
                const parsed = parseAIResponse(result);
                hookOutput.textContent = parsed.hook;
                bodyOutput.textContent = parsed.body;
                outputContainer.hidden = false;
                outputContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            console.error('Generation failed:', error);
            alert('Failed to generate post: ' + error.message);
        } finally {
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
            statusArea.hidden = true;
        }
    });

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

    /**
     * Attempts to generate a viral Reddit post
     */
    async function generateViralPost(input, apiKey, preferredModel, tone) {
        let modelsToTry = preferredModel === 'auto' ? MODELS : [preferredModel, ...MODELS.filter(m => m !== preferredModel)];
        let lastError = null;

        for (const model of modelsToTry) {
            statusText.textContent = `Model: ${model.split('/')[1].split(':')[0]}...`;

            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": window.location.href,
                        "X-Title": "Reddit Bot Pro",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": `You are a Reddit Viral Growth Engineer. Your task is to transform raw ideas into top-tier Reddit posts.

CONSTRAINTS:
1. OUTPUT FORMAT: You must ONLY output exactly in this format:
HOOK: [The Hook/Title]
BODY: [The Body Content]

2. HOOK (TITLE) RULES:
- Must be between 62 and 78 characters.
- Must be scroll-stopping and high-impact.
- No clickbait, but extreme curiosity gap.

3. BODY RULES:
- Tone: ${tone}.
- Use authentic Reddit formatting (bullet points, bolding).
- Start with a strong hook sentence.
- Ends with a call to action or a discussion starter.
- NO AI fluff like "In today's fast-paced world" or "I hope this helps". Keep it raw and honest.

4. OVERALL QUALITY:
- If the tone is 'story-driven', focus on personal experience.
- If 'upfront', be direct and value-heavy.
- If 'honest', be vulnerable and transparent.`
                            },
                            {
                                "role": "user",
                                "content": `Raw Input: ${input}\nTone: ${tone}`
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorDetails = await response.text();
                    throw new Error(`Model ${model} failed: ${response.status}`);
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
                if (preferredModel !== 'auto') break; // Don't fallback if user pick failed? (Or maybe we should?)
                continue;
            }
        }

        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    }
});
