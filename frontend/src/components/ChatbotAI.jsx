import React, { useState } from 'react';

const ChatbotAI = () => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Halo! Saya asisten AI IT Helpdesk. Ada yang bisa saya bantu hari ini?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const newMessages = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            // Panggil backend API yang sudah dibuat di Langkah 1
            const response = await fetch('http://localhost:5000/api/ai/chat', { // Sesuaikan port backend Anda jika bukan 5000
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}` // Buka komentar ini jika route butuh token login
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
                        <span style={{
                            display: 'inline-block',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: msg.role === 'user' ? '#14b8a6' : '#e5e7eb',
                            color: msg.role === 'user' ? '#fff' : '#1f2937',
                            maxWidth: '75%',
                            wordWrap: 'break-word'
                        }}>
                            {msg.content}
                        </span>
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