const express = require('express');
const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        // Memanggil API lokal Ollama (Default port: 11434)
        const response = await fetch('http://host.docker.internal:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2', // Ganti 'llama3' dengan nama model yang Anda install di Ollama
                messages: messages,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error AI Route:", error);
        res.status(500).json({ error: 'Gagal terhubung ke AI Ollama' });
    }
});

module.exports = router;