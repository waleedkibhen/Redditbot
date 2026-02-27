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
    const outputArea = document.getElementById('outputArea');
    const postOutput = document.getElementById('postOutput');
    const copyBtn = document.getElementById('copyBtn');

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
        outputArea.hidden = true;

        try {
            const result = await generateViralPost(text, apiKey);

            if (result) {
                postOutput.textContent = result;
                outputArea.hidden = false;
                outputArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            console.error('Generation failed:', error);
            alert('Failed to generate post. Check console for details.');
        } finally {
            // Reset button
            generateBtn.classList.remove('loading');
            generateBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(postOutput.textContent).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = 'var(--accent-color)';

            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = 'rgba(255, 255, 255, 0.1)';
            }, 2000);
        });
    });

    /**
     * Attempts to generate a viral Reddit post using a list of models as fallbacks.
     */
    async function generateViralPost(input, apiKey) {
        let lastError = null;

        for (const model of MODELS) {
            console.log(`Attempting generation with model: ${model}`);
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": window.location.href,
                        "X-Title": "Reddit Bot",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a master of Reddit marketing and viral content creation. Your goal is to transform messy, raw ideas into high-engagement, 'ready-to-post' Reddit content. \n\nFocus on:\n1. A catchy, scroll-stopping TITLE.\n2. A well-formatted BODY (use bolding, bullet points, and TL;DRs where appropriate).\n3. Authentic tone suited for subreddits like r/Entrepreneur, r/SaaS, or r/Advice.\n4. No AI-sounding fluff. Keep it raw, direct, and valuable.\n\nOutput format:\nTITLE: [The Title]\n\n[The Body]"
                            },
                            {
                                "role": "user",
                                "content": `Turn this raw idea into a viral Reddit post: ${input}`
                            }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorDetails = await response.text();
                    throw new Error(`Model ${model} failed: ${response.status} ${errorDetails}`);
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
                continue; // Try next model
            }
        }

        throw new Error(`All models failed. Last error: ${lastError?.message}`);
    }
});
