// src/PasswordProtect.js

import React, { useState } from 'react';

const PasswordProtect = ({ children }) => {
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [error, setError] = useState('');

  const correctPassword = '$inspectthiselement$'; // Set your temporary password here

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputPassword === correctPassword) {
      setPasswordEntered(true);
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return passwordEntered ? (
    <>{children}</>
  ) : (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Enter Password to Access the Site</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={inputPassword}
          onChange={(e) => setInputPassword(e.target.value)}
          placeholder="Password"
          style={{ padding: '10px', fontSize: '16px' }}
        />
        <br />
        <button type="submit" style={{ padding: '10px 20px', marginTop: '10px', fontSize: '16px' }}>
          Submit
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default PasswordProtect;
