const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory database
const users = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@gmail.com',
    password: bcrypt.hashSync('dnyanu@07', 10),
    role: 'admin',
    roomNumber: 'ADMIN-001'
  }
];

const complaints = [];
let complaintCounter = 1;

// Test route
app.get('/test', (req, res) => {
  res.json({ message: '✅ Backend is running!' });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Hostel Complaint System API is running!' });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, roomNumber } = req.body;
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: bcrypt.hashSync(password, 10),
      role: 'user',
      roomNumber: roomNumber || 'N/A'
    };
    
    users.push(newUser);
    
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, roomNumber: newUser.roomNumber },
      'secretkey123',
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token, user: newUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, roomNumber: user.roomNumber },
      'secretkey123',
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get complaints
app.get('/api/complaints', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    const userComplaints = complaints.filter(c => c.userId === decoded.id);
    res.json(userComplaints);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Create complaint
app.post('/api/complaints', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    const { title, description, category, priority } = req.body;
    
    const complaint = {
      id: complaintCounter,
      complaintId: `CMP${String(complaintCounter).padStart(4, '0')}`,
      title,
      description,
      category,
      priority,
      status: 'Pending',
      userId: decoded.id,
      userName: decoded.name,
      roomNumber: decoded.roomNumber || 'N/A',
      adminRemark: '',
      createdAt: new Date()
    };
    
    complaints.push(complaint);
    complaintCounter++;
    
    res.status(201).json({ success: true, complaint });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Track complaint by ID
app.get('/api/complaints/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    jwt.verify(token, 'secretkey123');
    const complaint = complaints.find(c => c.complaintId === req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    
    res.json(complaint);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Delete complaint
app.delete('/api/complaints/:id', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    const complaintIndex = complaints.findIndex(c => c.complaintId === req.params.id);
    
    if (complaintIndex === -1) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    
    const complaint = complaints[complaintIndex];
    
    if (complaint.userId !== decoded.id && decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    complaints.splice(complaintIndex, 1);
    res.json({ success: true, message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Admin - Get all complaints
app.get('/api/admin/complaints', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    
    res.json(complaints);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Admin - Update status
app.put('/api/admin/complaints/:id/status', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    
    const { status, adminRemark } = req.body;
    const complaint = complaints.find(c => c.complaintId === req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    
    complaint.status = status;
    if (adminRemark) complaint.adminRemark = adminRemark;
    
    res.json({ success: true, complaint });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// ✅ FIXED: Admin - Statistics (includes rejected count)
app.get('/api/admin/statistics', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }
    
    const totalComplaints = complaints.length;
    const pendingComplaints = complaints.filter(c => c.status === 'Pending').length;
    const inProgressComplaints = complaints.filter(c => c.status === 'In Progress').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
    const rejectedComplaints = complaints.filter(c => c.status === 'Rejected').length;
    const totalUsers = users.length;
    
    res.json({ 
      totalComplaints, 
      pendingComplaints, 
      inProgressComplaints, 
      resolvedComplaints, 
      rejectedComplaints,
      totalUsers 
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Temporary route to fix existing users' room numbers
app.get('/api/fix-users', (req, res) => {
  users.forEach(user => {
    if (!user.roomNumber || user.roomNumber === 'N/A') {
      user.roomNumber = 'N/A';
    }
  });
  res.json({ message: 'Users updated!', users: users.map(u => ({ name: u.name, roomNumber: u.roomNumber })) });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Test: http://localhost:${PORT}/test`);
});