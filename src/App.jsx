import React, { useState, useRef } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import './index.css';

const initialResumeState = {
  personalInfo: {
    fullName: '',
    title: '',
    profileImage: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    github: '',
    summary: ''
  },
  education: [],
  experience: [],
  projects: [],
  skills: '',
  languages: '',
  certificates: [],
  sectionOrder: [
    { id: 'skills', label: 'Skills' },
    { id: 'education', label: 'Education' },
    { id: 'projects', label: 'Projects' },
    { id: 'certificates', label: 'Certifications' },
    { id: 'languages', label: 'Languages' },
    { id: 'experience', label: 'Experience' }
  ]
};

const initialSettings = {
  accentColor: '#000000',
  nameColor: '#000000',
  fontFamily: 'Times New Roman',
  template: 'standard',
  pageSize: '1',
  showIcons: true
};

function App() {
  const [resumeData, setResumeData] = useState(initialResumeState);
  const [settings, setSettings] = useState(initialSettings);
  const componentRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container">
      <header className="app-header">
        <h1>ATS Resume Builder</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={() => setResumeData(initialResumeState)}>
            Reset Data
          </button>
          <button className="btn" onClick={handlePrint}>
            Download PDF
          </button>
        </div>
      </header>

      <main className="main-content">
        <Editor
          resumeData={resumeData}
          setResumeData={setResumeData}
          settings={settings}
          setSettings={setSettings}
        />
        <Preview
          resumeData={resumeData}
          settings={settings}
          ref={componentRef}
        />
      </main>
    </div>
  );
}

export default App;
