const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ============= PERSISTENT FILE STORAGE =============
const DATA_FILE = './database.json';

// Initialize database file
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    users: [
      {
        id: 1,
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: bcrypt.hashSync('dnyanu@07', 10),
        role: 'admin',
        roomNumber: 'ADMIN-001',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: 'John Student',
        email: 'john@student.com',
        password: bcrypt.hashSync('123456', 10),
        role: 'user',
        roomNumber: 'A-101',
        createdAt: new Date().toISOString()
      }
    ],
    complaints: [],
    complaintCounter: 1
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// Read data from file
const readData = () => {
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
};

// Write data to file
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// ============= AUTHENTICATION MIDDLEWARE =============
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, 'secretkey123');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// ============= AUTH ROUTES =============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, roomNumber } = req.body;
    const data = readData();
    
    if (data.users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const newUser = {
      id: data.users.length + 1,
      name,
      email,
      password: bcrypt.hashSync(password, 10),
      role: 'user',
      roomNumber,
      createdAt: new Date().toISOString()
    };
    
    data.users.push(newUser);
    writeData(data);
    
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, roomNumber: newUser.roomNumber },
      'secretkey123',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        roomNumber: newUser.roomNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = readData();
    
    const user = data.users.find(u => u.email === email);
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
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roomNumber: user.roomNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============= COMPLAINT ROUTES =============
app.post('/api/complaints', authMiddleware, (req, res) => {
  try {
    const { title, description, category, priority } = req.body;
    const data = readData();
    
    const complaint = {
      id: data.complaintCounter,
      complaintId: `CMP${String(data.complaintCounter).padStart(4, '0')}`,
      title,
      description,
      category,
      priority,
      status: 'Pending',
      userId: req.user.id,
      userName: req.user.name,
      roomNumber: req.user.roomNumber,
      adminRemark: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    data.complaints.push(complaint);
    data.complaintCounter++;
    writeData(data);
    
    res.status(201).json({ success: true, complaint });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/complaints', authMiddleware, (req, res) => {
  const data = readData();
  const userComplaints = data.complaints.filter(c => c.userId === req.user.id);
  res.json(userComplaints);
});

app.get('/api/complaints/:id', authMiddleware, (req, res) => {
  const data = readData();
  const complaint = data.complaints.find(c => c.complaintId === req.params.id);
  
  if (!complaint) {
    return res.status(404).json({ message: 'Complaint not found' });
  }
  
  if (complaint.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  res.json(complaint);
});

app.delete('/api/complaints/:id', authMiddleware, (req, res) => {
  const data = readData();
  const index = data.complaints.findIndex(c => c.complaintId === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Complaint not found' });
  }
  
  if (data.complaints[index].userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  data.complaints.splice(index, 1);
  writeData(data);
  res.json({ success: true, message: 'Complaint deleted' });
});

// ============= ADMIN ROUTES =============
app.get('/api/admin/complaints', authMiddleware, adminMiddleware, (req, res) => {
  const data = readData();
  const allComplaints = [...data.complaints].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(allComplaints);
});

app.put('/api/admin/complaints/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { status, adminRemark } = req.body;
    const data = readData();
    const complaint = data.complaints.find(c => c.complaintId === req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }
    
    complaint.status = status;
    if (adminRemark) {
      complaint.adminRemark = adminRemark;
    }
    if (status === 'Resolved') {
      complaint.resolvedAt = new Date().toISOString();
    }
    complaint.updatedAt = new Date().toISOString();
    
    writeData(data);
    
    res.json({ 
      success: true, 
      complaint,
      message: `Status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/statistics', authMiddleware, adminMiddleware, (req, res) => {
  const data = readData();
  const complaints = data.complaints;
  
  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => c.status === 'Pending').length;
  const inProgressComplaints = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;
  const rejectedComplaints = complaints.filter(c => c.status === 'Rejected').length;
  const totalUsers = data.users.filter(u => u.role === 'user').length;
  
  // Category statistics
  const categoryStats = {};
  complaints.forEach(c => {
    categoryStats[c.category] = (categoryStats[c.category] || 0) + 1;
  });
  
  res.json({ 
    totalComplaints, 
    pendingComplaints, 
    inProgressComplaints, 
    resolvedComplaints,
    rejectedComplaints,
    totalUsers,
    categoryStats
  });
});

// ============= TEST ROUTES =============
app.get('/test', (req, res) => {
  const data = readData();
  res.json({ 
    message: '✅ Backend is running!', 
    users: data.users.length, 
    complaints: data.complaints.length,
    adminEmail: 'admin@gmail.com'
  });
});

app.get('/fix-admin', (req, res) => {
  res.json({ 
    message: '✅ Admin is ready!',
    credentials: {
      email: 'admin@gmail.com',
      password: 'dnyanu@07',
      role: 'admin'
    }
  });
});

// ============= START SERVER =============
const PORT = 5002;
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`========================================`);
  console.log(`📝 Test: http://localhost:${PORT}/test`);
  console.log(`\n✅ Admin Login:`);
  console.log(`   Email: admin@gmail.com`);
  console.log(`   Password: dnyanu@07`);
  console.log(`\n📊 Data is now PERSISTENT (saved to file)!`);
  console.log(`========================================\n`);
});