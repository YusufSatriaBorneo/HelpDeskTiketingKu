require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const path = require('path'); // 1. PASTIKAN INI ADA DI ATAS

const app = express();

app.use(cors());
app.use(express.json());


// 2. TAMBAHKAN KODE INI UNTUK FOTO & FORCE DOWNLOAD
// Kode ini mengubah folder 'uploads' menjadi URL publik
// dan memaksa browser menjadikan file sebagai "attachment" (download)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: function (res, path, stat) {
    res.set('Content-Disposition', 'attachment');
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

// Basic health check
app.get('/', (req, res) => {
  res.send('HelpDesk TiketingKu API is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
