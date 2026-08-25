import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const EngineerDashboard = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // STATE: Tab default sekarang adalah 'home'
  const [activeTab, setActiveTab] = useState('home');

  const fetchTickets = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setTickets(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [token]);

  const handleUpdateTicket = async (e, ticketId) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const updateData = {
      status: formData.get('status'),
      notes: formData.get('notes')
    };

    try {
      const res = await fetch(`http://localhost:5000/api/tickets/${ticketId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (res.ok) {
        alert('Data tiket berhasil diperbarui!');
        fetchTickets();
      } else {
        const errorData = await res.json();
        alert(`Gagal memperbarui tiket: ${errorData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    }
  };

  // LOGIKA PEMISAHAN TIKET
  const actionTickets = tickets.filter(t => t.status !== 'RESOLVED');
  const historyTickets = tickets.filter(t => t.status === 'RESOLVED');

  // MENGHITUNG TOTAL TIKET UNTUK MENU HOME
  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED').length;
  const holdCount = tickets.filter(t => t.status === 'HOLD' || t.status === 'PENDING').length;
  const completedCount = tickets.filter(t => t.status === 'RESOLVED').length;

  const currentTabTickets = activeTab === 'it-action' ? actionTickets : activeTab === 'history' ? historyTickets : [];

  // FITUR PENCARIAN
  const filteredTickets = currentTabTickets.filter(ticket => {
    const searchLower = searchQuery.toLowerCase();
    const ticketNo = ticket.ticketNumber ? ticket.ticketNumber.toLowerCase() : '';
    const titleLower = ticket.title ? ticket.title.toLowerCase() : '';
    return ticketNo.includes(searchLower) || titleLower.includes(searchLower);
  });

  // HELPER UNTUK STYLING SIDEBAR
  const getMenuItemStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 18px 12px 28px',
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
    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '100vh' }}>

      {/* SIDEBAR ENGINEER */}
      <aside style={{
        width: '280px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        padding: '24px 16px 24px 0',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto'
      }}>
        {/* Header Sidebar */}
        <div style={{ padding: '0 10px 0 28px', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>Menu Engineer</h3>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Manajemen Tiket IT</p>
        </div>

        {/* Tombol Menu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* TOMBOL BARU: Home */}
          <button
            style={getMenuItemStyle(activeTab === 'home')}
            onClick={() => setActiveTab('home')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🏠</span>
              <span>Home</span>
            </div>
          </button>

          <button
            style={getMenuItemStyle(activeTab === 'it-action')}
            onClick={() => setActiveTab('it-action')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>📥</span>
              <span>IT Action</span>
            </div>
            <span style={getBadgeStyle(activeTab === 'it-action')}>
              {actionTickets.length}
            </span>
          </button>

          <button
            style={getMenuItemStyle(activeTab === 'history')}
            onClick={() => setActiveTab('history')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>📜</span>
              <span>History</span>
            </div>
            <span style={getBadgeStyle(activeTab === 'history')}>
              {historyTickets.length}
            </span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '2rem 3rem' }}>
        <h2>Engineer Dashboard</h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
          {activeTab === 'home' ? 'Ringkasan total tiket yang menjadi tanggung jawab Anda.'
            : activeTab === 'it-action' ? 'Tickets assigned to you for resolution.'
              : 'Riwayat tiket yang telah Anda selesaikan.'}
        </p>

        {/* ================= TAMPILAN TAB HOME ================= */}
        {activeTab === 'home' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>

            <div className="card" style={{ textAlign: 'center', padding: '2rem', borderTop: '4px solid #3b82f6' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Open / Assigned</h3>
              <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0 0 0', color: '#3b82f6' }}>
                {openCount}
              </p>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '2rem', borderTop: '4px solid #f59e0b' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Hold / Pending</h3>
              <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0 0 0', color: '#f59e0b' }}>
                {holdCount}
              </p>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '2rem', borderTop: '4px solid #14b8a6' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Completed</h3>
              <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: '1rem 0 0 0', color: '#14b8a6' }}>
                {completedCount}
              </p>
            </div>

          </div>
        )}

        {/* ================= TAMPILAN TAB IT-ACTION & HISTORY ================= */}
        {activeTab !== 'home' && (
          <>
            {/* Search Bar */}
            <div style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="🔍 Cari Nomor Tiket atau Judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', maxWidth: '400px', padding: '0.75rem' }}
              />
            </div>

            <div className="grid-2">
              {filteredTickets.map(ticket => (
                <div key={ticket.id} className="card">

                  {/* Header Card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                        #{ticket.ticketNumber || 'N/A'}
                      </span>
                      <h4 style={{ margin: '0.25rem 0 0 0' }}>{ticket.title}</h4>
                    </div>
                    <span style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em',
                      color: ticket.status === 'RESOLVED' ? 'white' :
                        ticket.status === 'OPEN' || ticket.status === 'ASSIGNED' ? 'white' :
                          ticket.status === 'HOLD' || ticket.status === 'PENDING' ? '#ffffffff' :
                            'white',
                      backgroundColor: ticket.status === 'RESOLVED' ? '#14b8a6' :
                        ticket.status === 'OPEN' || ticket.status === 'ASSIGNED' ? '#3b82f6' :
                          ticket.status === 'HOLD' || ticket.status === 'PENDING' ? '#fcd34d' :
                            '#6b7280'
                    }}>
                      {ticket.status}
                    </span>
                  </div>

                  {/* Informasi Kategori & Hostname */}
                  <div style={{ backgroundColor: 'rgba(128, 128, 128, 0.15)', padding: '10px', borderRadius: '5px', marginBottom: '10px', fontSize: '0.9rem' }}>
                    <strong>Kategori:</strong> {ticket.category || '-'} ({ticket.subCategory || '-'})<br />
                    <strong>Hostname:</strong> {ticket.hostname || '-'} <br />
                    <strong>Priority:</strong> {ticket.priority || 'Standard'}
                  </div>

                  {/* Deskripsi */}
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{ticket.description}</p>

                  {/* Lampiran */}
                  {ticket.attachmentUrl && (
                    <div style={{ marginBottom: '1rem' }}>
                      <a
                        href={`http://localhost:5000/${ticket.attachmentUrl.replace(/\\/g, '/')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#4da6ff', textDecoration: 'none', fontSize: '0.9rem' }}
                      >
                        📎 Lihat Lampiran
                      </a>
                    </div>
                  )}

                  {/* Info Creator */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Created by: {ticket.createdBy?.name} ({ticket.createdBy?.email})<br />
                    Created at: {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>

                  <hr style={{ border: '1px solid var(--border-color)', marginBottom: '1rem' }} />

                  {/* LOGIKA CONDITIONAL RENDERING: Form update vs Status Terkunci */}
                  {ticket.status !== 'RESOLVED' ? (
                    <form onSubmit={(e) => handleUpdateTicket(e, ticket.id)} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status Tiket:</label>
                        <select name="status" defaultValue={ticket.status} className="form-control" style={{ width: '100%', padding: '8px', backgroundColor: 'rgba(51, 51, 51, 1)', color: 'white', border: 'none', borderRadius: '4px' }}>
                          <option value="OPEN">Open</option>
                          <option value="HOLD">Hold</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Catatan Engineer / Helpdesk:</label>
                        <textarea
                          name="notes"
                          defaultValue={ticket.notes}
                          className="form-control"
                          style={{ width: '100%', padding: '8px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                          rows="2"
                          placeholder="Tambahkan update atau catatan di sini..."
                        ></textarea>
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', width: '100%' }}>
                        Simpan Perubahan
                      </button>
                    </form>
                  ) : (
                    // TAMPILAN JIKA TIKET SUDAH RESOLVED (Terkunci)
                    <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(39, 174, 96, 0.1)', color: '#27ae60', borderRadius: '5px', fontWeight: 'bold' }}>
                      Tiket telah diselesaikan (Resolved)
                      {ticket.notes && (
                        <p style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal', textAlign: 'left' }}>
                          <strong>Catatan Akhir:</strong> {ticket.notes}
                        </p>
                      )}
                    </div>
                  )}

                </div>
              ))}
              {filteredTickets.length === 0 && <p style={{ gridColumn: '1 / -1', color: 'var(--text-secondary)' }}>Tidak ada tiket di kategori ini.</p>}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default EngineerDashboard;