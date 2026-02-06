import React, { useState, useRef } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import './index.css';
import { parseResume } from './utils/resumeParser';

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
  const fileInputRef = useRef(null);

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const parsedData = await parseResume(file);
      setResumeData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, ...parsedData.personalInfo },
        skills: parsedData.skills ? (prev.skills ? prev.skills + ', ' + parsedData.skills : parsedData.skills) : prev.skills,
        languages: parsedData.languages ? (prev.languages ? prev.languages + ', ' + parsedData.languages : parsedData.languages) : prev.languages,
        education: [...prev.education, ...parsedData.education],
        experience: [...prev.experience, ...parsedData.experience],
        projects: [...prev.projects, ...parsedData.projects],
        certificates: [...prev.certificates, ...parsedData.certificates]
      }));
      alert("Resume imported successfully! Please review the data.");
    } catch (err) {
      console.error(err);
      alert(`Failed to parse resume: ${err.message}`);
    }
    if (event.target) event.target.value = '';
  };

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
          <button className="btn btn-outline" onClick={handleImportClick}>
            Import Resume
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.docx"
          />
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
