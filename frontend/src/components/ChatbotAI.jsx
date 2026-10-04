import React, { useState, useEffect } from 'react';

const ChatbotAI = () => {
    const [messages, setMessages] = useState(() => {
        // Menggunakan kunci statis "ai_chat_history" untuk Solusi 1
        const savedData = localStorage.getItem("ai_chat_history");
        if (savedData) {
            try {
                const { timestamp, data } = JSON.parse(savedData);
                const sekarang = new Date().getTime();
                if (sekarang - timestamp < 86400000) {
                    return data;
                } else {
                    localStorage.removeItem("ai_chat_history");
                }
            } catch (e) {
                console.error("Gagal memuat history:", e);
            }
        }
        return [{ role: 'assistant', content: 'Halo! Saya asisten AI IT Helpdesk. Ada yang bisa saya bantu hari ini?' }];
    });

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const dataToSave = {
            timestamp: new Date().getTime(),
            data: messages,
        };
        // Simpan menggunakan kunci statis yang sama
        localStorage.setItem("ai_chat_history", JSON.stringify(dataToSave));
    }, [messages]);

    // FUNGSI INI SEBELUMNYA TIDAK SENGAJA TERHAPUS, SEKARANG SUDAH DIKEMBALIKAN
    const formatMessage = (text) => {
        if (!text) return "";

        // Memaksa "Enter" ganda sebelum angka list dan asterisk agar berjarak
        let formatted = text.replace(/(\s)(\d+\.\s|\*\s)/g, '\n\n$2');

        // Pisahkan teks berdasarkan baris baru
        return formatted.split('\n').map((line, index) => {
            // Deteksi teks yang diapit bintang dua untuk ditebalkan
            const parts = line.split(/(\*\*.*?\*\*)/g);

            return (
                <div key={index} style={{ minHeight: line.trim() === '' ? '8px' : 'auto', marginBottom: '4px' }}>
                    {parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i}>{part.slice(2, -2)}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </div>
            );
        });
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const newMessages = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Panggil backend API
            const response = await fetch('http://localhost:5000/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}` // Buka jika butuh token
                },
                body: JSON.stringify({ messages: newMessages }),
            });

            const data = await response.json();

            if (data.message) {
                setMessages((prev) => [...prev, data.message]);
            } else {
                throw new Error('Respons AI tidak valid');
            }
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, saya sedang mengalami gangguan koneksi ke server.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>💬 Tanya AI Support</h2>

            <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px', backgroundColor: '#f9fafb' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '12px' }}>
                        <div style={{
                            display: 'inline-block',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: msg.role === 'user' ? '#14b8a6' : '#e5e7eb',
                            color: msg.role === 'user' ? '#fff' : '#1f2937',
                            maxWidth: '75%',
                            wordWrap: 'break-word',
                            textAlign: 'left'
                        }}>
                            {/* Menggunakan fungsi formatMessage yang sudah ditambahkan di atas */}
                            {formatMessage(msg.content)}
                        </div>
                    </div>
                ))}
                {isLoading && <div style={{ textAlign: 'left', color: '#6b7280', fontSize: '0.9rem' }}>AI sedang mengetik...</div>}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ketik keluhan atau pertanyaan Anda..."
                    style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    style={{ padding: '10px 20px', backgroundColor: '#14b8a6', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                >
                    Kirim
                </button>
            </div>
        </div>
    );
};

export default ChatbotAI;