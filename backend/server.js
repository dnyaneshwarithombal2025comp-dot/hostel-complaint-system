// Remove or comment out the original app.listen
// const PORT = process.env.PORT || 5002;
// app.listen(PORT, () => { ... });

// Add this instead:
if (process.env.VERCEL) {
  // On Vercel, export the app
  module.exports = app;
} else {
  // Local development
  const PORT = process.env.PORT || 5002;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Test: http://localhost:${PORT}/test`);
  });
}