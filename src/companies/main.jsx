import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CompanyBoard from './CompanyBoard.jsx';

// Static hosting: read the figures taken from the companies' annual reports.
const DATA_URL = `${import.meta.env.BASE_URL}data/companies/maharatna-financials.json`;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CompanyBoard source={DATA_URL} />
  </StrictMode>,
);
