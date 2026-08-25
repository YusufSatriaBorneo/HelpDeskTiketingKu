import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const UserDashboard = () => {
  const { token } = useAuth();

  // State untuk Tab Aktif (Sidebar)
  const [activeTab, setActiveTab] = useState('create');

  // State List Tiket
  const [tickets, setTickets] = useState([]);

  // State Form
  const [title, setTitle] = useState('');
  const [hostname, setHostname] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTickets(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', title);
    formData.append('hostname', hostname);
    formData.append('category', category);
    formData.append('subCategory', subCategory);
    formData.append('description', description);
    if (attachment) formData.append('attachment', attachment);

    try {
      const res = await fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        setTitle('');
        setHostname('');
        setCategory('');
        setSubCategory('');
        setDescription('');
        setAttachment(null);

        fetchTickets();
        alert('Tiket berhasil dibuat!');
        setActiveTab('history');
      } else {
        const errorData = await res.json();
        alert(`Gagal membuat tiket: ${errorData.message || errorData.error || 'Terjadi kesalahan'}`);
      }
    } catch (err) {
      console.error("Network error:", err);
      alert('Gagal terhubung ke server.');
    }
  };

  // Helper untuk styling menu item agar persis seperti gambar Helpdesk
  const getMenuItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    // PERUBAHAN: Padding kiri 28px agar sejajar logo, padding atas-bawah 12px
    padding: '12px 18px 12px 28px',
    // PERUBAHAN: Border radius rata kiri (0), melengkung kanan (50px)
    borderRadius: '0 50px 50px 0',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: isActive ? '#e8f0fe' : 'transparent',
    color: isActive ? '#1a73e8' : 'var(--text-primary)',
    fontWeight: isActive ? '600' : '500',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    textAlign: 'left'
  });

  const getBadgeStyle = (isActive) => ({
    backgroundColor: isActive ? '#1a73e8' : '#e0e0e0',
    color: isActive ? '#fff' : '#555',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700'
  });

  return (
    // PERUBAHAN: minHeight disetel ke 100vh
    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '100vh' }}>

      {/* SIDEBAR (Disamakan total dengan UI HelpDesk) */}
      <aside style={{
        width: '280px', // Disamakan lebarnya dengan HelpDeskDashboard
        height: '100vh', // Full tinggi layar ke bawah
        position: 'sticky',
        top: 0,
        // PERUBAHAN: Padding kiri 0 agar mepet ke ujung layar
        padding: '24px 16px 24px 0',
        borderRight: '1px solid var(--border-color)', // Garis pemisah full ke bawah
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto'
      }}>
        {/* Header Sidebar */}
        {/* PERUBAHAN: Tambah padding kiri 28px agar teksnya sejajar logo HelpDesk TiketingKu */}
        <div style={{ padding: '0 10px 0 28px', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Menu User</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manajemen Tiket IT</p>
        </div>

        {/* Tombol Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            style={getMenuItemStyle(activeTab === 'create')}
            onClick={() => setActiveTab('create')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>📝</span>
              <span>Create Tiket</span>
            </div>
          </button>

          <button
            style={getMenuItemStyle(activeTab === 'history')}
            onClick={() => setActiveTab('history')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>📜</span>
              <span>History</span>
            </div>
            {/* Badge angka jumlah tiket */}
            <span style={getBadgeStyle(activeTab === 'history')}>
              {tickets.length}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      {/* PERUBAHAN: Padding disamakan dengan HelpDeskDashboard */}
      <main style={{ flex: 1, padding: '2rem 3rem' }}>

        {/* TAMPILAN TAB CREATE TICKET */}
        {activeTab === 'create' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 8px 0' }}>User Dashboard</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Overview pembuatan tiket baru untuk penanganan IT.</p>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Form Create Ticket
              </h3>
              <form onSubmit={handleSubmit}>

                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: PC tidak bisa menyala" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Hostname / IP Adress</label>
                  <input type="text" className="form-control" value={hostname} onChange={e => setHostname(e.target.value)} placeholder="Contoh: 192.168.1.10 atau PC-User1" required />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={category} onChange={e => { setCategory(e.target.value); setSubCategory(''); }} required>
                    <option value="">Pilih Kategori</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Account">Account</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Sub-Category</label>
                  <select className="form-control" value={subCategory} onChange={e => setSubCategory(e.target.value)} required disabled={!category}>
                    <option value="">Pilih Sub-Kategori</option>
                    {category === 'Hardware' && (
                      <>
                        <option value="Monitor Blank/Rusak">Monitor Blank/Rusak</option>
                        <option value="Keyboard / Mouse Error">Keyboard / Mouse Error</option>
                        <option value="Printer Tidak Bisa Print">Printer Tidak Bisa Print</option>
                        <option value="PC / Laptop Mati Total">PC / Laptop Mati Total</option>
                        <option value="Upgrade Hardware (RAM/SSD)">Upgrade Hardware (RAM/SSD)</option>
                      </>
                    )}
                    {category === 'Software' && (
                      <>
                        <option value="Install Ulang OS (Windows/Mac/Linux)">Install Ulang OS (Windows/Mac/Linux)</option>
                        <option value="Install Microsoft Office">Install Microsoft Office</option>
                        <option value="Install Antivirus">Install Antivirus</option>
                        <option value="Install Aplikasi Desain/Video">Install Aplikasi Desain/Video</option>
                        <option value="Install Software Lainnya">Install Software Lainnya</option>
                      </>
                    )}
                    {category === 'Account' && (
                      <>
                        <option value="Microsoft 365">Lupa Password</option>
                        <option value="Windows AD">Akun Sering Terlock</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="4" value={description} onChange={e => setDescription(e.target.value)} placeholder="Jelaskan detail kendala yang dialami..." required></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Attachment (PNG/JPG, Max 5MB)</label>
                  <input type="file" className="form-control" accept="image/png, image/jpeg" onChange={e => setAttachment(e.target.files[0])} />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Ticket</button>
              </form>
            </div>
          </div>
        )}

        {/* TAMPILAN TAB HISTORY TICKET */}
        {activeTab === 'history' && (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ margin: '0 0 8px 0' }}>History Tiket Anda</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Overview riwayat tiket yang pernah Anda buat.</p>
            </div>

            <div className="grid-2">
              {tickets.map(ticket => (
                <div key={ticket.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                        #{ticket.ticketNumber || 'N/A'}
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0 0' }}>{ticket.title}</h4>
                    </div>
                    <span style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em',
                      color: ticket.status === 'RESOLVED' ? 'white' :
                        ticket.status === 'OPEN' ? 'white' :
                          ticket.status === 'HOLD' || ticket.status === 'PENDING' ? '#fff' :
                            'white',
                      backgroundColor: ticket.status === 'RESOLVED' ? '#14b8a6' :
                        ticket.status === 'OPEN' ? '#3b82f6' :
                          ticket.status === 'HOLD' || ticket.status === 'PENDING' ? '#fcd34d' :
                            '#6b7280'
                    }}>
                      {ticket.status}
                    </span>
                  </div>

                  <div style={{ backgroundColor: 'rgba(128, 128, 128, 0.08)', padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '0.9rem' }}>
                    <strong>Kategori:</strong> {ticket.category || '-'} ({ticket.subCategory || '-'}) <br />
                    <strong>Hostname / IP Adress:</strong> {ticket.hostname || '-'}
                  </div>

                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>{ticket.description}</p>

                  {ticket.attachmentUrl && (
                    <div style={{ marginBottom: '1rem' }}>
                      <a href={`http://localhost:5000/${ticket.attachmentUrl.replace(/\\/g, '/')}`} target="_blank" rel="noreferrer" style={{ color: '#1a73e8', textDecoration: 'none', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📎 Lihat Lampiran
                      </a>
                    </div>
                  )}

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Creator: Anda<br />
                    Created: {new Date(ticket.createdAt).toLocaleDateString()}<br />
                  </div>

                  {ticket.notes && (
                    <div style={{ marginTop: '12px', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Catatan IT: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{ticket.notes}</span>
                    </div>
                  )}

                  {ticket.assignedTo && (
                    <div style={{ backgroundColor: 'rgba(128, 128, 128, 0.08)', padding: '8px 12px', borderRadius: '6px', marginTop: '12px', fontSize: '0.85rem' }}>
                      Assigned to: <strong>{ticket.assignedTo.name}</strong>
                    </div>
                  )}
                </div>
              ))}

              {tickets.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                  Tidak ada tiket yang ditemukan pada kategori ini.
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default UserDashboard;