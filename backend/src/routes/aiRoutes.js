const express = require('express');
const router = express.Router();

router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        // 1. SYSTEM PROMPT DENGAN ATURAN KETAT (GUARDRAILS)
        const systemPrompt = {
            role: 'system',
            content: `Anda adalah Asisten AI Helpdesk IT. Tugas utama Anda adalah membantu pengguna menyelesaikan masalah teknis, hardware, software, jaringan, dan layanan IT.

SISTEM EVALUASI & ATURAN RESPONS (STRICT GUARDRAILS):

1. JIKA PERTANYAAN TERKAIT IT:
   - Contoh topik IT: Masalah laptop/PC, audio/mikrofon, printer, jaringan/Wi-Fi, aplikasi, akun, sistem operasi, hardware, dan software.
   - Tindakan: Jawab langsung dengan solusi teknis yang jelas dan membantu. 
   - LARANGAN: DILARANG menyertakan kata "Maaf", kalimat penolakan, atau pernyataan identitas di awal jawaban untuk pertanyaan IT.

2. JIKA PERTANYAAN DILUAR IT:
   - Contoh topik non-IT: Resep makanan, olahraga, hiburan, rekreasi, belanja, pengetahuan umum non-teknis, dll.
   - Tindakan: Tampilkan HANYA kalimat berikut secara persis (tanpa teks alternatif, tanpa resep, dan tanpa pengetikan tambahan apapun):

   Maaf, saya adalah asisten IT Helpdesk. Saya hanya dapat membantu pertanyaan atau masalah terkait teknis dan layanan IT.`
        };

        // 2. GABUNGKAN SYSTEM PROMPT DENGAN RIWAYAT PESAN DARI USER
        const fullMessages = [systemPrompt, ...(messages || [])];

        // 3. MEMANGGIL API LOKAL OLLAMA DENGAN TEMPERATURE
        const response = await fetch('http://host.docker.internal:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2',
                messages: fullMessages,
                stream: false,
                options: {
                    temperature: 0.1 // Memaksa AI lebih patuh & konsisten pada aturan
                }
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