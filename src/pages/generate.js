// src/pages/generate.js
/* this app was developed by @jams2blues with love for the Tezos community */
import React from 'react';
import Header from '../components/Header';
import GenerateContract from '../components/GenerateContract/GenerateContract';

export default function GeneratePage() {
  return (
    <>
      <Header />
      <GenerateContract />
    </>
  );
}
