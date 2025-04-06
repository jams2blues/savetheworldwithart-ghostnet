// src/components/ErrorBoundary.js
/* this app was developed by @jams2blues with love for the Tezos community */
import React from 'react';
import { Alert, AlertTitle } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error">
          <AlertTitle>Something went wrong.</AlertTitle>
          {this.state.error.toString()}
        </Alert>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
