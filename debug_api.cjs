const fs = require('fs');
const { exec } = require('child_process');

// Login first to get session cookies
exec('curl -s -c cookies.txt -X POST -H "Content-Type: application/json" -d \'{"email":"dickonkent@gmail.com","password":"PasswordABC123"}\' http://localhost:5000/api/login', (error, stdout, stderr) => {
  if (error) {
    console.error('Login error:', error);
    return;
  }
  
  // Now fetch journal entries using saved cookies
  exec('curl -s -b cookies.txt http://localhost:5000/api/journal', (error, stdout, stderr) => {
    if (error) {
      console.error('Journal fetch error:', error);
      return;
    }
    
    try {
      // Save the response to a file for inspection
      fs.writeFileSync('journal_response.json', stdout);
      console.log('Journal entries saved to journal_response.json');
    } catch (err) {
      console.error('Error saving response:', err);
    }
  });
});
